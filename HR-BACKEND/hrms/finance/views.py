# from django.db.models import Count, Q, Sum
# from rest_framework import mixins, status, viewsets
# from rest_framework.decorators import action
# from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
# from rest_framework.permissions import IsAuthenticated
# from rest_framework.response import Response
# from rest_framework.views import APIView

# from common.choices import AdvanceStatus, ExpenseStatus, UserRole
# from common.utils import money

# from .models import Advance, AuditLog, Expense, LedgerEntry, Notification
# from .serializers import (
#     AuditLogSerializer,
#     AdvanceBalanceSerializer,
#     AdvanceSerializer,
#     CheckerDashboardSerializer,
#     ExpenseSerializer,
#     LedgerEntrySerializer,
#     MakerDashboardSerializer,
#     NotificationSerializer,
#     RejectExpenseSerializer,
#     ReportsSummarySerializer,
#     UploadBillSerializer,
# )
# from .services import (
#     approve_expense,
#     close_expense,
#     create_advance,
#     create_expense,
#     reject_expense,
#     review_expense,
#     submit_expense,
#     upload_bill,
# )


# class AdvanceViewSet(
#     mixins.ListModelMixin,
#     mixins.CreateModelMixin,
#     mixins.RetrieveModelMixin,
#     viewsets.GenericViewSet,
# ):
#     serializer_class = AdvanceSerializer
#     permission_classes = [IsAuthenticated]
#     filterset_fields = ["status", "maker", "allocated_by"]
#     search_fields = ["reference", "maker__username", "maker__full_name", "remarks"]
#     ordering_fields = ["created_at", "total_amount", "spent_amount", "balance_amount"]

#     def get_queryset(self):
#         queryset = Advance.objects.select_related("maker", "allocated_by")
#         if self.request.user.role == UserRole.MAKER:
#             return queryset.filter(maker=self.request.user)
#         return queryset

#     def create(self, request, *args, **kwargs):
#         if request.user.role != UserRole.CHECKER:
#             return Response(
#                 {"detail": "Only checker users can allocate advances."},
#                 status=status.HTTP_403_FORBIDDEN,
#             )

#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         advance = create_advance(
#             maker=serializer.validated_data["maker"],
#             allocated_by=request.user,
#             total_amount=serializer.validated_data["total_amount"],
#             remarks=serializer.validated_data.get("remarks", ""),
#         )
#         return Response(self.get_serializer(advance).data, status=status.HTTP_201_CREATED)

#     @action(detail=True, methods=["get"], url_path="ledger")
#     def ledger(self, request, pk=None):
#         advance = self.get_object()
#         entries = advance.ledger_entries.select_related("expense").all()
#         return Response(LedgerEntrySerializer(entries, many=True).data)

#     @action(detail=False, methods=["get"], url_path="maker-balances")
#     def maker_balances(self, request):
#         if request.user.role != UserRole.CHECKER:
#             return Response(
#                 {"detail": "Only checker users can view maker balances."},
#                 status=status.HTTP_403_FORBIDDEN,
#             )

#         balances = (
#             Advance.objects.select_related("maker")
#             .values("maker_id", "maker__full_name", "maker__username")
#             .annotate(
#                 total_advance=Sum("total_amount"),
#                 total_spent=Sum("spent_amount"),
#                 remaining_balance=Sum("balance_amount"),
#                 active_advances=Count("id", filter=Q(balance_amount__gt=0)),
#             )
#             .order_by("maker__full_name", "maker__username")
#         )

#         payload = [
#             {
#                 "maker_id": item["maker_id"],
#                 "maker_name": item["maker__full_name"] or item["maker__username"],
#                 "maker_username": item["maker__username"],
#                 "total_advance": money(item["total_advance"]),
#                 "total_spent": money(item["total_spent"]),
#                 "remaining_balance": money(item["remaining_balance"]),
#                 "active_advances": item["active_advances"],
#             }
#             for item in balances
#         ]
#         return Response(AdvanceBalanceSerializer(payload, many=True).data)


# class LedgerEntryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
#     serializer_class = LedgerEntrySerializer
#     permission_classes = [IsAuthenticated]
#     filterset_fields = ["advance", "entry_type"]
#     search_fields = ["advance__reference", "expense__reference", "note"]
#     ordering_fields = ["created_at", "amount", "balance_after"]

#     def get_queryset(self):
#         queryset = LedgerEntry.objects.select_related("advance", "expense", "advance__maker")
#         if self.request.user.role == UserRole.MAKER:
#             return queryset.filter(advance__maker=self.request.user)
#         return queryset


# class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
#     serializer_class = NotificationSerializer
#     permission_classes = [IsAuthenticated]
#     http_method_names = ["get", "patch", "head", "options"]
#     ordering_fields = ["created_at"]

#     def get_queryset(self):
#         return Notification.objects.filter(user=self.request.user).select_related("related_expense")

#     @action(detail=True, methods=["patch"], url_path="read")
#     def mark_read(self, request, pk=None):
#         notification = self.get_object()
#         if not notification.is_read:
#             notification.is_read = True
#             notification.save(update_fields=["is_read"])
#         return Response(
#             {
#                 "notification": self.get_serializer(notification).data,
#                 "unread_count": self.get_queryset().filter(is_read=False).count(),
#             }
#         )

#     @action(detail=False, methods=["patch"], url_path="mark-all-read")
#     def mark_all_read(self, request):
#         queryset = self.get_queryset().filter(is_read=False)
#         unread_count = queryset.count()
#         queryset.update(is_read=True)
#         return Response({"updated": unread_count, "unread_count": 0})

#     @action(detail=False, methods=["get"], url_path="unread-count")
#     def unread_count(self, request):
#         return Response({"unread_count": self.get_queryset().filter(is_read=False).count()})


# class ExpenseViewSet(viewsets.ModelViewSet):
#     serializer_class = ExpenseSerializer
#     permission_classes = [IsAuthenticated]
#     parser_classes = [JSONParser, MultiPartParser, FormParser]
#     http_method_names = ["get", "post", "patch", "head", "options"]
#     filterset_fields = ["status", "advance", "maker", "reviewed_by", "approved_by"]
#     search_fields = [
#         "reference",
#         "payable_to",
#         "category",
#         "purpose",
#         "advance__reference",
#     ]
#     ordering_fields = [
#         "created_at",
#         "updated_at",
#         "amount",
#         "submitted_at",
#         "reviewed_at",
#         "approved_at",
#         "closed_at",
#     ]

#     def get_queryset(self):
#         queryset = Expense.objects.select_related(
#             "advance",
#             "maker",
#             "reviewed_by",
#             "approved_by",
#             "advance__allocated_by",
#         )
#         if self.request.user.role == UserRole.MAKER:
#             return queryset.filter(maker=self.request.user)
#         if self.request.user.role == UserRole.CHECKER:
#             assigned_queryset = queryset.filter(
#                 Q(reviewed_by=self.request.user) | Q(approved_by=self.request.user)
#             ).distinct()
#             if getattr(self, "action", None) == "list":
#                 requested_status = self.request.query_params.get("status")
#                 if requested_status == ExpenseStatus.SUBMITTED:
#                     return assigned_queryset.filter(
#                         status=ExpenseStatus.SUBMITTED,
#                         reviewed_by=self.request.user,
#                     )
#                 if requested_status == ExpenseStatus.REVIEWED:
#                     return assigned_queryset.filter(
#                         status=ExpenseStatus.REVIEWED,
#                         approved_by=self.request.user,
#                     )
#                 if requested_status == ExpenseStatus.BILL_SUBMITTED:
#                     return assigned_queryset.filter(
#                         status=ExpenseStatus.BILL_SUBMITTED,
#                         reviewed_by=self.request.user,
#                     )
#             return assigned_queryset
#         return queryset

#     def create(self, request, *args, **kwargs):
#         if request.user.role != UserRole.MAKER:
#             return Response(
#                 {"detail": "Only maker users can create expenses."},
#                 status=status.HTTP_403_FORBIDDEN,
#             )

#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         expense = create_expense(maker=request.user, **serializer.validated_data)
#         return Response(
#             self.get_serializer(expense).data,
#             status=status.HTTP_201_CREATED,
#         )

#     def partial_update(self, request, *args, **kwargs):
#         expense = self.get_object()
#         if request.user.role != UserRole.MAKER or expense.maker_id != request.user.id:
#             return Response(
#                 {"detail": "Only the maker can edit this expense."},
#                 status=status.HTTP_403_FORBIDDEN,
#             )
#         if expense.status != ExpenseStatus.DRAFT:
#             return Response(
#                 {"detail": "Only draft expenses can be edited."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         serializer = self.get_serializer(expense, data=request.data, partial=True)
#         serializer.is_valid(raise_exception=True)
#         serializer.save()
#         return Response(serializer.data)

#     @action(detail=True, methods=["post"])
#     def submit(self, request, pk=None):
#         expense = self.get_object()
#         expense = submit_expense(expense=expense, actor=request.user)
#         return Response(self.get_serializer(expense).data)

#     @action(detail=True, methods=["post"])
#     def review(self, request, pk=None):
#         expense = self.get_object()
#         expense = review_expense(expense=expense, actor=request.user)
#         return Response(self.get_serializer(expense).data)

#     @action(detail=True, methods=["post"])
#     def approve(self, request, pk=None):
#         expense = self.get_object()
#         expense = approve_expense(expense=expense, actor=request.user)
#         return Response(self.get_serializer(expense).data)

#     @action(detail=True, methods=["post"])
#     def reject(self, request, pk=None):
#         expense = self.get_object()
#         serializer = RejectExpenseSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         expense = reject_expense(
#             expense=expense,
#             actor=request.user,
#             rejection_reason=serializer.validated_data["rejection_reason"],
#         )
#         return Response(self.get_serializer(expense).data)

#     @action(detail=True, methods=["post"], url_path="upload-bill")
#     def upload_bill_action(self, request, pk=None):
#         expense = self.get_object()
#         serializer = UploadBillSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         expense = upload_bill(
#             expense=expense,
#             actor=request.user,
#             bill_file=serializer.validated_data["bill_file"],
#         )
#         return Response(self.get_serializer(expense).data)

#     @action(detail=True, methods=["post"])
#     def close(self, request, pk=None):
#         expense = self.get_object()
#         expense = close_expense(expense=expense, actor=request.user)
#         return Response(self.get_serializer(expense).data)

#     @action(detail=True, methods=["get"])
#     def history(self, request, pk=None):
#         expense = self.get_object()
#         logs = expense.audit_logs.select_related("actor", "advance", "expense")
#         return Response(AuditLogSerializer(logs, many=True).data)


# class MakerDashboardView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         if request.user.role != UserRole.MAKER:
#             return Response(
#                 {"detail": "Only maker users can view maker dashboard summary."},
#                 status=status.HTTP_403_FORBIDDEN,
#             )

#         advances = Advance.objects.filter(maker=request.user)
#         expenses = Expense.objects.filter(maker=request.user)
#         notifications = Notification.objects.filter(user=request.user).select_related(
#             "related_expense"
#         )[:5]
#         payload = {
#             "total_advance": money(advances.aggregate(total=Sum("total_amount"))["total"]),
#             "total_spent": money(advances.aggregate(total=Sum("spent_amount"))["total"]),
#             "remaining_balance": money(
#                 advances.aggregate(total=Sum("balance_amount"))["total"]
#             ),
#             "pending_bills": expenses.filter(status=ExpenseStatus.APPROVED).count(),
#             "recent_expenses_count": expenses.count(),
#             "unread_notifications_count": Notification.objects.filter(
#                 user=request.user,
#                 is_read=False,
#             ).count(),
#             "recent_notifications": notifications,
#         }
#         return Response(MakerDashboardSerializer(payload).data)


# class CheckerDashboardView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         if request.user.role != UserRole.CHECKER:
#             return Response(
#                 {"detail": "Only checker users can view checker dashboard summary."},
#                 status=status.HTTP_403_FORBIDDEN,
#             )

#         verified_statuses = [
#             ExpenseStatus.APPROVED,
#             ExpenseStatus.BILL_SUBMITTED,
#             ExpenseStatus.CLOSED,
#         ]
#         notifications = Notification.objects.filter(user=request.user).select_related(
#             "related_expense"
#         )[:5]
#         payload = {
#             "total_allocated": money(
#                 Advance.objects.aggregate(total=Sum("total_amount"))["total"]
#             ),
#             "total_verified_spend": money(
#                 Expense.objects.filter(status__in=verified_statuses).aggregate(
#                     total=Sum("amount")
#                 )["total"]
#             ),
#             "pending_reviews": Expense.objects.filter(
#                 status=ExpenseStatus.SUBMITTED,
#                 reviewed_by=request.user,
#             ).count(),
#             "pending_approvals": Expense.objects.filter(
#                 status=ExpenseStatus.REVIEWED,
#                 approved_by=request.user,
#             ).count(),
#             "pending_bill_verifications": Expense.objects.filter(
#                 status=ExpenseStatus.BILL_SUBMITTED,
#                 reviewed_by=request.user,
#             ).count(),
#             "active_advances": Advance.objects.filter(
#                 status__in=[AdvanceStatus.ACTIVE, AdvanceStatus.PARTIALLY_USED]
#             ).count(),
#             "unread_notifications_count": Notification.objects.filter(
#                 user=request.user,
#                 is_read=False,
#             ).count(),
#             "recent_notifications": notifications,
#         }
#         return Response(CheckerDashboardSerializer(payload).data)


# class ReportsSummaryView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         if request.user.role not in {UserRole.CHECKER, UserRole.ADMIN}:
#             return Response(
#                 {"detail": "Only checker or admin users can view reports."},
#                 status=status.HTTP_403_FORBIDDEN,
#             )

#         balances = (
#             Advance.objects.select_related("maker")
#             .values("maker_id", "maker__full_name", "maker__username")
#             .annotate(
#                 total_advance=Sum("total_amount"),
#                 total_spent=Sum("spent_amount"),
#                 remaining_balance=Sum("balance_amount"),
#                 active_advances=Count("id", filter=Q(balance_amount__gt=0)),
#             )
#             .order_by("maker__full_name", "maker__username")
#         )

#         balances_payload = [
#             {
#                 "maker_id": item["maker_id"],
#                 "maker_name": item["maker__full_name"] or item["maker__username"],
#                 "maker_username": item["maker__username"],
#                 "total_advance": money(item["total_advance"]),
#                 "total_spent": money(item["total_spent"]),
#                 "remaining_balance": money(item["remaining_balance"]),
#                 "active_advances": item["active_advances"],
#             }
#             for item in balances
#         ]

#         expenses_by_status = {
#             choice: Expense.objects.filter(status=choice).count()
#             for choice in ExpenseStatus.values
#         }

#         payload = {
#             "total_advances_allocated": money(
#                 Advance.objects.aggregate(total=Sum("total_amount"))["total"]
#             ),
#             "total_spent": money(
#                 Advance.objects.aggregate(total=Sum("spent_amount"))["total"]
#             ),
#             "remaining_balances": money(
#                 Advance.objects.aggregate(total=Sum("balance_amount"))["total"]
#             ),
#             "closed_expenses_count": Expense.objects.filter(
#                 status=ExpenseStatus.CLOSED
#             ).count(),
#             "expenses_by_status": expenses_by_status,
#             "balances_by_maker": balances_payload,
#         }
#         return Response(ReportsSummarySerializer(payload).data)



from django.db.models import Count, Q, Sum
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from common.choices import AdvanceStatus, ExpenseStatus, UserRole
from common.utils import money

from .models import (
    Advance,
    AuditLog,
    Expense,
    LedgerEntry,
    Notification,
    get_total_available_balance_for_maker,
)
from .serializers import (
    AuditLogSerializer,
    AdvanceBalanceSerializer,
    AdvanceSerializer,
    CheckerDashboardSerializer,
    ExpenseSerializer,
    LedgerEntrySerializer,
    MakerFinancialSummarySerializer,
    MakerDashboardSerializer,
    NotificationSerializer,
    RejectExpenseSerializer,
    ReportsSummarySerializer,
    UploadBillSerializer,
)
from .services import (
    approve_expense,
    close_expense,
    create_advance,
    create_expense,
    reject_expense,
    review_expense,
    submit_expense,
    upload_bill,
)


class AdvanceViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AdvanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "maker", "allocated_by"]
    search_fields = ["reference", "maker__username", "maker__full_name", "remarks"]
    ordering_fields = ["created_at", "total_amount", "spent_amount", "balance_amount"]

    def get_queryset(self):
        queryset = Advance.objects.select_related("maker", "allocated_by")
        if self.request.user.role == UserRole.MAKER:
            return queryset.filter(maker=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role != UserRole.CHECKER:
            return Response(
                {"detail": "Only checker users can allocate advances."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        advance = create_advance(
            maker=serializer.validated_data["maker"],
            allocated_by=request.user,
            total_amount=serializer.validated_data["total_amount"],
            remarks=serializer.validated_data.get("remarks", ""),
        )
        return Response(self.get_serializer(advance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="ledger")
    def ledger(self, request, pk=None):
        advance = self.get_object()
        entries = advance.ledger_entries.select_related("expense").all()
        return Response(LedgerEntrySerializer(entries, many=True).data)

    @action(detail=False, methods=["get"], url_path="maker-balances")
    def maker_balances(self, request):
        if request.user.role != UserRole.CHECKER:
            return Response(
                {"detail": "Only checker users can view maker balances."},
                status=status.HTTP_403_FORBIDDEN,
            )

        balances = (
            Advance.objects.select_related("maker")
            .values(
    "maker_id",
    "maker__full_name",
    "maker__username"
)
            .annotate(
                total_advance=Sum("total_amount"),
                total_spent=Sum("spent_amount"),
                remaining_balance=Sum("balance_amount"),
                active_advances=Count("id", filter=Q(balance_amount__gt=0)),
            )
            .order_by("maker__full_name", "maker__username")
        )

        payload = [
            {
                "maker_id": item["maker_id"],
                "maker_name": item["maker__full_name"] or item["maker__username"],
                "maker_username": item["maker__username"],
                "total_advance": money(item["total_advance"]),
                "total_spent": money(item["total_spent"]),
                "remaining_balance": money(item["remaining_balance"]),
                "active_advances": item["active_advances"],
            }
            for item in balances
        ]
        return Response(AdvanceBalanceSerializer(payload, many=True).data)

    @action(detail=False, methods=["get"], url_path="financial-summary")
    def financial_summary(self, request):
        maker = request.user if request.user.role == UserRole.MAKER else None

        if maker is None:
            if request.user.role not in {UserRole.CHECKER, UserRole.ADMIN}:
                return Response(
                    {"detail": "Only maker, checker, or admin users can view advance summaries."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            maker_id = request.query_params.get("maker_id")
            if not maker_id:
                return Response(
                    {"maker_id": ["maker_id query parameter is required."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            maker = User.objects.filter(id=maker_id, role=UserRole.MAKER).first()
            if maker is None:
                return Response(
                    {"detail": "Maker not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        advances = Advance.objects.filter(maker=maker)
        payload = {
            "maker_id": maker.id,
            "maker_name": maker.full_name or maker.username,
            "maker_username": maker.username,
            "total_allocated": money(advances.aggregate(total=Sum("total_amount"))["total"]),
            "total_spent": money(advances.aggregate(total=Sum("spent_amount"))["total"]),
            "current_available_balance": get_total_available_balance_for_maker(maker),
            "active_advances": advances.filter(balance_amount__gt=0).count(),
        }
        return Response(MakerFinancialSummarySerializer(payload).data)


class LedgerEntryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = LedgerEntrySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["advance", "entry_type"]
    search_fields = ["advance_reference", "expense_reference", "note"]
    ordering_fields = ["created_at", "amount", "balance_after"]

    def get_queryset(self):
        queryset = LedgerEntry.objects.select_related("advance", "expense", "advance__maker")
        if self.request.user.role == UserRole.MAKER:
            return queryset.filter(advance__maker=self.request.user)
        return queryset


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("related_expense")

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response(
            {
                "notification": self.get_serializer(notification).data,
                "unread_count": self.get_queryset().filter(is_read=False).count(),
            }
        )

    @action(detail=False, methods=["patch"], url_path="mark-all-read")
    def mark_all_read(self, request):
        queryset = self.get_queryset().filter(is_read=False)
        unread_count = queryset.count()
        queryset.update(is_read=True)
        return Response({"updated": unread_count, "unread_count": 0})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"unread_count": self.get_queryset().filter(is_read=False).count()})


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ["status", "advance", "maker", "reviewed_by", "approved_by"]
    search_fields = [
        "reference",
        "payable_to",
        "category",
        "purpose",
        "advance__reference",
    ]
    ordering_fields = [
        "created_at",
        "updated_at",
        "amount",
        "submitted_at",
        "reviewed_at",
        "approved_at",
        "closed_at",
    ]

    def get_queryset(self):
        queryset = Expense.objects.select_related(
            "advance",
            "maker",
            "reviewed_by",
            "approved_by",
            "advance__allocated_by",
        )
        if self.request.user.role == UserRole.MAKER:
            return queryset.filter(maker=self.request.user)
        if self.request.user.role == UserRole.CHECKER:
            assigned_queryset = queryset.filter(
                Q(reviewed_by=self.request.user) | Q(approved_by=self.request.user)
            ).distinct()
            if getattr(self, "action", None) == "list":
                requested_status = self.request.query_params.get("status")
                if requested_status == ExpenseStatus.SUBMITTED:
                    return assigned_queryset.filter(
                        status=ExpenseStatus.SUBMITTED,
                        reviewed_by=self.request.user,
                    )
                if requested_status == ExpenseStatus.REVIEWED:
                    return assigned_queryset.filter(
                        status=ExpenseStatus.REVIEWED,
                        approved_by=self.request.user,
                    )
                if requested_status == ExpenseStatus.BILL_SUBMITTED:
                    return assigned_queryset.filter(
                        status=ExpenseStatus.BILL_SUBMITTED,
                        reviewed_by=self.request.user,
                    )
            return assigned_queryset
        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role != UserRole.MAKER:
            return Response(
                {"detail": "Only maker users can create expenses."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = create_expense(maker=request.user, **serializer.validated_data)
        return Response(
            self.get_serializer(expense).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        expense = self.get_object()
        if request.user.role != UserRole.MAKER or expense.maker_id != request.user.id:
            return Response(
                {"detail": "Only the maker can edit this expense."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if expense.status != ExpenseStatus.DRAFT:
            return Response(
                {"detail": "Only draft expenses can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(expense, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        expense = self.get_object()
        expense = submit_expense(expense=expense, actor=request.user)
        return Response(self.get_serializer(expense).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        expense = self.get_object()
        expense = review_expense(expense=expense, actor=request.user)
        return Response(self.get_serializer(expense).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        expense = self.get_object()
        expense = approve_expense(expense=expense, actor=request.user)
        return Response(self.get_serializer(expense).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        expense = self.get_object()
        serializer = RejectExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = reject_expense(
            expense=expense,
            actor=request.user,
            rejection_reason=serializer.validated_data["rejection_reason"],
        )
        return Response(self.get_serializer(expense).data)

    @action(detail=True, methods=["post"], url_path="upload-bill")
    def upload_bill_action(self, request, pk=None):
        expense = self.get_object()
        serializer = UploadBillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = upload_bill(
            expense=expense,
            actor=request.user,
            bill_file=serializer.validated_data["bill_file"],
            payment_mode=serializer.validated_data["payment_mode"],
            transaction_reference=serializer.validated_data["transaction_reference"],
            payment_details=serializer.validated_data["payment_details"],
        )
        return Response(self.get_serializer(expense).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        expense = self.get_object()
        expense = close_expense(expense=expense, actor=request.user)
        return Response(self.get_serializer(expense).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        expense = self.get_object()
        logs = expense.audit_logs.select_related("actor", "advance", "expense")
        return Response(AuditLogSerializer(logs, many=True).data)


class MakerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.MAKER:
            return Response(
                {"detail": "Only maker users can view maker dashboard summary."},
                status=status.HTTP_403_FORBIDDEN,
            )

        advances = Advance.objects.filter(maker=request.user)
        expenses = Expense.objects.filter(maker=request.user)
        notifications = Notification.objects.filter(user=request.user).select_related(
            "related_expense"
        )[:5]
        payload = {
            "total_advance": money(advances.aggregate(total=Sum("total_amount"))["total"]),
            "total_spent": money(advances.aggregate(total=Sum("spent_amount"))["total"]),
            "remaining_balance": money(
                advances.aggregate(total=Sum("balance_amount"))["total"]
            ),
            "pending_bills": expenses.filter(status=ExpenseStatus.APPROVED).count(),
            "recent_expenses_count": expenses.count(),
            "unread_notifications_count": Notification.objects.filter(
                user=request.user,
                is_read=False,
            ).count(),
            "recent_notifications": notifications,
        }
        return Response(MakerDashboardSerializer(payload).data)


class CheckerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.CHECKER:
            return Response(
                {"detail": "Only checker users can view checker dashboard summary."},
                status=status.HTTP_403_FORBIDDEN,
            )

        verified_statuses = [
            ExpenseStatus.APPROVED,
            ExpenseStatus.BILL_SUBMITTED,
            ExpenseStatus.CLOSED,
        ]
        notifications = Notification.objects.filter(user=request.user).select_related(
            "related_expense"
        )[:5]
        payload = {
            "total_allocated": money(
                Advance.objects.aggregate(total=Sum("total_amount"))["total"]
            ),
            "total_verified_spend": money(
                Expense.objects.filter(status__in=verified_statuses).aggregate(
                    total=Sum("amount")
                )["total"]
            ),
            "pending_reviews": Expense.objects.filter(
                status=ExpenseStatus.SUBMITTED,
                reviewed_by=request.user,
            ).count(),
            "pending_approvals": Expense.objects.filter(
                status=ExpenseStatus.REVIEWED,
                approved_by=request.user,
            ).count(),
            "pending_bill_verifications": Expense.objects.filter(
                status=ExpenseStatus.BILL_SUBMITTED,
                reviewed_by=request.user,
            ).count(),
            "active_advances": Advance.objects.filter(
                status__in=[AdvanceStatus.ACTIVE, AdvanceStatus.PARTIALLY_USED]
            ).count(),
            "unread_notifications_count": Notification.objects.filter(
                user=request.user,
                is_read=False,
            ).count(),
            "recent_notifications": notifications,
        }
        return Response(CheckerDashboardSerializer(payload).data)


class ReportsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in {UserRole.CHECKER, UserRole.ADMIN}:
            return Response(
                {"detail": "Only checker or admin users can view reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        balances = (
            Advance.objects.select_related("maker")
            .values(
    "maker_id",
    "maker__full_name",
    "maker__username"
)
            .annotate(
                total_advance=Sum("total_amount"),
                total_spent=Sum("spent_amount"),
                remaining_balance=Sum("balance_amount"),
                active_advances=Count("id", filter=Q(balance_amount__gt=0)),
            )
            .order_by("maker__full_name", "maker__username")
        )

        balances_payload = [
            {
                "maker_id": item["maker_id"],
                "maker_name": item["maker__full_name"] or item["maker__username"],
                "maker_username": item["maker__username"],
                "total_advance": money(item["total_advance"]),
                "total_spent": money(item["total_spent"]),
                "remaining_balance": money(item["remaining_balance"]),
                "active_advances": item["active_advances"],
            }
            for item in balances
        ]

        expenses_by_status = {
            choice: Expense.objects.filter(status=choice).count()
            for choice in ExpenseStatus.values
        }

        payload = {
            "total_advances_allocated": money(
                Advance.objects.aggregate(total=Sum("total_amount"))["total"]
            ),
            "total_spent": money(
                Advance.objects.aggregate(total=Sum("spent_amount"))["total"]
            ),
            "remaining_balances": money(
                Advance.objects.aggregate(total=Sum("balance_amount"))["total"]
            ),
            "closed_expenses_count": Expense.objects.filter(
                status=ExpenseStatus.CLOSED
            ).count(),
            "expenses_by_status": expenses_by_status,
            "balances_by_maker": balances_payload,
        }
        return Response(ReportsSummarySerializer(payload).data)