# from django.conf import settings
# from django.core.exceptions import ValidationError as DjangoValidationError
# from django.db import transaction
# from django.utils import timezone
# from rest_framework import serializers
# from uuid import uuid4

# from common.choices import (
#     AdvanceStatus,
#     ExpenseStatus,
#     LedgerEntryType,
#     NotificationType,
#     UserRole,
# )
# from common.utils import amount_to_words, generate_reference, money

# from .email_service import (
#     send_bill_submitted_email_to_reviewer,
#     send_closed_email_to_maker,
#     send_expense_forwarded_to_approver,
#     send_expense_submitted_to_reviewer,
#     send_final_approval_email_to_maker,
#     send_approver_rejection_email,
#     send_reviewer_rejection_email,
# )
# from .models import Advance, AuditLog, Expense, LedgerEntry, Notification


# def _next_reference(prefix, model):
#     for _ in range(5):
#         candidate = generate_reference(prefix, uuid4().hex[:6].upper())
#         if not model.objects.filter(reference=candidate).exists():
#             return candidate
#     raise RuntimeError(f"Unable to generate a unique reference for {prefix}.")


# def _ensure_checker(user, field_name):
#     if user.role not in {UserRole.CHECKER, UserRole.ADMIN}:
#         raise serializers.ValidationError({field_name: "User must be a checker or admin."})


# def _ensure_maker(user, field_name):
#     if user.role != UserRole.MAKER:
#         raise serializers.ValidationError({field_name: "User must be a maker."})


# def _log_action(*, action, description, actor=None, advance=None, expense=None, metadata=None):
#     AuditLog.objects.create(
#         actor=actor,
#         advance=advance,
#         expense=expense,
#         action=action,
#         description=description,
#         metadata=metadata or {},
#     )


# def _expense_action_url(expense):
#     base_url = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
#     path = f"/expenses/{expense.id}"
#     return f"{base_url}{path}" if base_url else path


# def create_notification(user, title, message, notification_type, related_expense=None, action_url=""):
#     return Notification.objects.create(
#         user=user,
#         title=title,
#         message=message,
#         notification_type=notification_type,
#         related_expense=related_expense,
#         action_url=action_url,
#     )


# def _notify_reviewer(expense):
#     maker_name = expense.maker.full_name or expense.maker.username
#     title = f"Expense {expense.reference} submitted for review"
#     message = (
#         f"{maker_name} submitted an expense for {expense.amount} under {expense.category}. "
#         f"Purpose: {expense.purpose}. Status: {expense.status}."
#     )
#     create_notification(
#         user=expense.reviewed_by,
#         title=title,
#         message=message,
#         notification_type=NotificationType.EXPENSE_SUBMITTED,
#         related_expense=expense,
#         action_url=_expense_action_url(expense),
#     )
#     send_expense_submitted_to_reviewer(
#         expense,
#         old_status=ExpenseStatus.DRAFT,
#         new_status=ExpenseStatus.SUBMITTED,
#     )


# def _notify_approver(expense):
#     maker_name = expense.maker.full_name or expense.maker.username
#     title = f"Expense {expense.reference} awaiting final approval"
#     message = (
#         f"{maker_name}'s expense for {expense.amount} is ready for final approval. "
#         f"Category: {expense.category}. Purpose: {expense.purpose}. Status: {expense.status}."
#     )
#     create_notification(
#         user=expense.approved_by,
#         title=title,
#         message=message,
#         notification_type=NotificationType.EXPENSE_REVIEWED,
#         related_expense=expense,
#         action_url=_expense_action_url(expense),
#     )
#     send_expense_forwarded_to_approver(
#         expense,
#         old_status=ExpenseStatus.SUBMITTED,
#         new_status=ExpenseStatus.REVIEWED,
#     )


# def _notify_maker_review_completed(expense):
#     title = f"Expense {expense.reference} moved to final approval"
#     message = (
#         f"Your expense for {expense.amount} was reviewed successfully and sent to "
#         f"{expense.approved_by.full_name or expense.approved_by.username} for final approval."
#     )
#     create_notification(
#         user=expense.maker,
#         title=title,
#         message=message,
#         notification_type=NotificationType.EXPENSE_REVIEWED,
#         related_expense=expense,
#         action_url=_expense_action_url(expense),
#     )


# def _notify_maker_rejected(expense, actor, stage_label, *, old_status):
#     title = f"Expense {expense.reference} rejected"
#     message = (
#         f"Your expense was rejected during {stage_label} by "
#         f"{actor.full_name or actor.username}. Reason: {expense.rejection_reason}."
#     )
#     create_notification(
#         user=expense.maker,
#         title=title,
#         message=message,
#         notification_type=NotificationType.EXPENSE_REJECTED,
#         related_expense=expense,
#         action_url=_expense_action_url(expense),
#     )
#     if actor.id == expense.reviewed_by_id:
#         send_reviewer_rejection_email(
#             expense,
#             expense.rejection_reason,
#             old_status=old_status,
#             new_status=ExpenseStatus.REJECTED,
#         )
#     else:
#         send_approver_rejection_email(
#             expense,
#             expense.rejection_reason,
#             old_status=old_status,
#             new_status=ExpenseStatus.REJECTED,
#         )


# def _notify_maker_approved(expense):
#     title = f"Expense {expense.reference} approved"
#     message = (
#         f"Your expense for {expense.amount} has been approved. "
#         "Next step: upload the bill for final verification."
#     )
#     create_notification(
#         user=expense.maker,
#         title=title,
#         message=message,
#         notification_type=NotificationType.EXPENSE_APPROVED,
#         related_expense=expense,
#         action_url=_expense_action_url(expense),
#     )
#     send_final_approval_email_to_maker(
#         expense,
#         old_status=ExpenseStatus.REVIEWED,
#         new_status=ExpenseStatus.APPROVED,
#     )


# def _notify_bill_submitted(expense):
#     title = f"Bill submitted for expense {expense.reference}"
#     message = (
#         f"{expense.maker.full_name or expense.maker.username} uploaded the bill for "
#         f"{expense.amount}. Please verify the bill and close the expense if valid."
#     )
#     create_notification(
#         user=expense.reviewed_by,
#         title=title,
#         message=message,
#         notification_type=NotificationType.BILL_PENDING,
#         related_expense=expense,
#         action_url=_expense_action_url(expense),
#     )
#     send_bill_submitted_email_to_reviewer(
#         expense,
#         old_status=ExpenseStatus.APPROVED,
#         new_status=ExpenseStatus.BILL_SUBMITTED,
#     )


# def _notify_maker_closed(expense):
#     title = f"Expense {expense.reference} closed"
#     message = (
#         f"Your expense for {expense.amount} has been closed after bill verification."
#     )
#     create_notification(
#         user=expense.maker,
#         title=title,
#         message=message,
#         notification_type=NotificationType.EXPENSE_APPROVED,
#         related_expense=expense,
#         action_url=_expense_action_url(expense),
#     )
#     send_closed_email_to_maker(
#         expense,
#         old_status=ExpenseStatus.BILL_SUBMITTED,
#         new_status=ExpenseStatus.CLOSED,
#     )


# @transaction.atomic
# def create_advance(*, maker, allocated_by, total_amount, remarks=""):
#     _ensure_maker(maker, "maker")
#     _ensure_checker(allocated_by, "allocated_by")

#     advance = Advance.objects.create(
#         reference=_next_reference("ADV", Advance),
#         maker=maker,
#         allocated_by=allocated_by,
#         total_amount=money(total_amount),
#         spent_amount=money(0),
#         remarks=remarks,
#     )

#     LedgerEntry.objects.create(
#         advance=advance,
#         entry_type=LedgerEntryType.ADVANCE,
#         amount=advance.total_amount,
#         balance_after=advance.balance_amount,
#         note="Advance allocated to maker.",
#     )
#     _log_action(
#         action="ADVANCE_ALLOCATED",
#         description=f"Advance {advance.reference} allocated to {maker.full_name or maker.username}.",
#         actor=allocated_by,
#         advance=advance,
#         metadata={"total_amount": str(advance.total_amount)},
#     )
#     return advance


# @transaction.atomic
# def create_expense(*, advance, maker, reviewed_by, approved_by, **payload):
#     _ensure_maker(maker, "maker")
#     _ensure_checker(reviewed_by, "reviewed_by")
#     _ensure_checker(approved_by, "approved_by")

#     if advance.maker_id != maker.id:
#         raise serializers.ValidationError(
#             {"advance": "You can only create expenses against your own advance."}
#         )

#     amount = money(payload.get("amount"))
#     if amount > money(advance.balance_amount):
#         raise serializers.ValidationError(
#             {"amount": "Expense amount cannot exceed the available advance balance."}
#         )

#     expense = Expense.objects.create(
#         reference=_next_reference("EXP", Expense),
#         advance=advance,
#         maker=maker,
#         reviewed_by=reviewed_by,
#         approved_by=approved_by,
#         payable_to=payload["payable_to"],
#         expense_date=payload.get("expense_date") or timezone.localdate(),
#         amount=amount,
#         amount_in_words=payload.get("amount_in_words") or amount_to_words(amount),
#         category=payload["category"],
#         purpose=payload["purpose"],
#         payment_mode=payload["payment_mode"],
#         transaction_reference=payload.get("transaction_reference", ""),
#         remarks=payload.get("remarks", ""),
#     )
#     _log_action(
#         action="EXPENSE_CREATED",
#         description=f"Expense {expense.reference} created against {advance.reference}.",
#         actor=maker,
#         advance=advance,
#         expense=expense,
#         metadata={"amount": str(expense.amount)},
#     )
#     return expense


# @transaction.atomic
# def submit_expense(*, expense, actor):
#     if actor.id != expense.maker_id:
#         raise serializers.ValidationError("Only the maker can submit this expense.")
#     if expense.status != ExpenseStatus.DRAFT:
#         raise serializers.ValidationError("Only draft expenses can be submitted.")

#     expense.status = ExpenseStatus.SUBMITTED
#     expense.submitted_at = timezone.now()
#     expense.save(update_fields=["status", "submitted_at", "updated_at"])
#     _log_action(
#         action="EXPENSE_SUBMITTED",
#         description=f"Expense {expense.reference} submitted for checker review.",
#         actor=actor,
#         advance=expense.advance,
#         expense=expense,
#     )
#     _notify_reviewer(expense)
#     return expense


# @transaction.atomic
# def review_expense(*, expense, actor):
#     _ensure_checker(actor, "reviewed_by")
#     if expense.status != ExpenseStatus.SUBMITTED:
#         raise serializers.ValidationError("Only submitted expenses can be reviewed.")
#     if actor.role != UserRole.ADMIN and actor.id != expense.reviewed_by_id:
#         raise serializers.ValidationError("Only the assigned reviewer can review this expense.")

#     expense.status = ExpenseStatus.REVIEWED
#     expense.reviewed_at = timezone.now()
#     expense.save(update_fields=["status", "reviewed_at", "updated_at"])
#     _log_action(
#         action="EXPENSE_REVIEWED",
#         description=f"Expense {expense.reference} reviewed by checker.",
#         actor=actor,
#         advance=expense.advance,
#         expense=expense,
#     )
#     _notify_approver(expense)
#     _notify_maker_review_completed(expense)
#     return expense


# @transaction.atomic
# def approve_expense(*, expense, actor):
#     _ensure_checker(actor, "approved_by")
#     if expense.status != ExpenseStatus.REVIEWED:
#         raise serializers.ValidationError("Only reviewed expenses can be approved.")
#     if actor.role != UserRole.ADMIN and actor.id != expense.approved_by_id:
#         raise serializers.ValidationError("Only the assigned approver can approve this expense.")

#     advance = expense.advance
#     amount = money(expense.amount)

#     if amount > money(advance.balance_amount):
#         raise serializers.ValidationError(
#             "Expense amount exceeds the remaining advance balance."
#         )

#     advance.spent_amount = money(advance.spent_amount) + amount
#     advance.save()

#     expense.status = ExpenseStatus.APPROVED
#     expense.approved_at = timezone.now()
#     expense.save(update_fields=["status", "approved_at", "updated_at"])

#     LedgerEntry.objects.create(
#         advance=advance,
#         expense=expense,
#         entry_type=LedgerEntryType.SPEND,
#         amount=amount,
#         balance_after=advance.balance_amount,
#         note=f"Expense {expense.reference} approved and deducted from advance.",
#     )
#     _log_action(
#         action="EXPENSE_APPROVED",
#         description=f"Expense {expense.reference} approved and deducted from advance.",
#         actor=actor,
#         advance=advance,
#         expense=expense,
#         metadata={"balance_after": str(advance.balance_amount)},
#     )
#     _notify_maker_approved(expense)
#     return expense


# @transaction.atomic
# def upload_bill(*, expense, actor, bill_file):
#     if actor.id != expense.maker_id:
#         raise serializers.ValidationError("Only the maker can upload the bill.")
#     if expense.status != ExpenseStatus.APPROVED:
#         raise serializers.ValidationError("Bill upload is allowed only for approved expenses.")
#     if not bill_file:
#         raise serializers.ValidationError({"bill_file": "Bill file is required."})

#     expense.bill_file = bill_file
#     expense.status = ExpenseStatus.BILL_SUBMITTED
#     expense.bill_submitted_at = timezone.now()
#     try:
#         expense.save(update_fields=["bill_file", "status", "bill_submitted_at", "updated_at"])
#     except DjangoValidationError as exc:
#         raise serializers.ValidationError(exc.message_dict) from exc
#     _log_action(
#         action="BILL_UPLOADED",
#         description=f"Bill uploaded for expense {expense.reference}.",
#         actor=actor,
#         advance=expense.advance,
#         expense=expense,
#     )
#     _notify_bill_submitted(expense)
#     return expense


# @transaction.atomic
# def close_expense(*, expense, actor):
#     _ensure_checker(actor, "closed_by")
#     if expense.status != ExpenseStatus.BILL_SUBMITTED:
#         raise serializers.ValidationError(
#             "Only bill-submitted expenses can be closed."
#         )
#     if actor.role != UserRole.ADMIN and actor.id != expense.reviewed_by_id:
#         raise serializers.ValidationError(
#             "Only the assigned reviewer can close this bill submission."
#         )

#     expense.status = ExpenseStatus.CLOSED
#     expense.closed_at = timezone.now()
#     expense.save(update_fields=["status", "closed_at", "updated_at"])

#     advance = expense.advance
#     if advance.balance_amount == money(0):
#         advance.status = AdvanceStatus.CLOSED
#         advance.save()
#     _log_action(
#         action="EXPENSE_CLOSED",
#         description=f"Expense {expense.reference} closed after bill verification.",
#         actor=actor,
#         advance=advance,
#         expense=expense,
#     )
#     _notify_maker_closed(expense)
#     return expense


# @transaction.atomic
# def reject_expense(*, expense, actor, rejection_reason):
#     _ensure_checker(actor, "rejected_by")
#     if expense.status not in {ExpenseStatus.SUBMITTED, ExpenseStatus.REVIEWED}:
#         raise serializers.ValidationError(
#             "Only submitted or reviewed expenses can be rejected."
#         )
#     if (
#         expense.status == ExpenseStatus.SUBMITTED
#         and actor.role != UserRole.ADMIN
#         and actor.id != expense.reviewed_by_id
#     ):
#         raise serializers.ValidationError("Only the assigned reviewer can reject this expense.")
#     if (
#         expense.status == ExpenseStatus.REVIEWED
#         and actor.role != UserRole.ADMIN
#         and actor.id != expense.approved_by_id
#     ):
#         raise serializers.ValidationError("Only the assigned approver can reject this expense.")

#     reason = str(rejection_reason or "").strip()
#     if not reason:
#         raise serializers.ValidationError(
#             {"rejection_reason": "Rejection message is required."}
#         )

#     old_status = expense.status
#     expense.status = ExpenseStatus.REJECTED
#     expense.rejection_reason = reason
#     expense.save(update_fields=["status", "rejection_reason", "updated_at"])
#     _log_action(
#         action="EXPENSE_REJECTED",
#         description=f"Expense {expense.reference} rejected: {reason}",
#         actor=actor,
#         advance=expense.advance,
#         expense=expense,
#         metadata={"rejection_reason": reason},
#     )
#     stage_label = "review" if actor.id == expense.reviewed_by_id else "approval"
#     _notify_maker_rejected(expense, actor, stage_label, old_status=old_status)
#     return expense



from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from uuid import uuid4

from common.choices import (
    AdvanceStatus,
    ExpenseStatus,
    LedgerEntryType,
    NotificationType,
    UserRole,
)
from common.utils import amount_to_words, generate_reference, money

from .email_service import (
    send_bill_submitted_email_to_reviewer,
    send_closed_email_to_maker,
    send_expense_forwarded_to_approver,
    send_expense_submitted_to_reviewer,
    send_final_approval_email_to_maker,
    send_approver_rejection_email,
    send_reviewer_rejection_email,
)
from .models import (
    Advance,
    AuditLog,
    Expense,
    ExpenseAdvanceAllocation,
    LedgerEntry,
    Notification,
    get_active_advances_for_maker,
    get_total_available_balance_for_maker,
)


def _next_reference(prefix, model):
    for _ in range(5):
        candidate = generate_reference(prefix, uuid4().hex[:6].upper())
        if not model.objects.filter(reference=candidate).exists():
            return candidate
    raise RuntimeError(f"Unable to generate a unique reference for {prefix}.")


def _ensure_checker(user, field_name):
    if user.role not in {UserRole.CHECKER, UserRole.ADMIN}:
        raise serializers.ValidationError({field_name: "User must be a checker or admin."})


def _ensure_maker(user, field_name):
    if user.role != UserRole.MAKER:
        raise serializers.ValidationError({field_name: "User must be a maker."})


def _log_action(*, action, description, actor=None, advance=None, expense=None, metadata=None):
    AuditLog.objects.create(
        actor=actor,
        advance=advance,
        expense=expense,
        action=action,
        description=description,
        metadata=metadata or {},
    )


def _expense_action_url(expense):
    base_url = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
    accounts_base_path = getattr(settings, "FRONTEND_ACCOUNTS_BASE_PATH", "/accounts").rstrip("/")
    path = f"{accounts_base_path}/expenses/{expense.id}"
    return f"{base_url}{path}" if base_url else path


def create_notification(user, title, message, notification_type, related_expense=None, action_url=""):
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        related_expense=related_expense,
        action_url=action_url,
    )


def _notify_reviewer(expense):
    maker_name = expense.maker.full_name or expense.maker.username
    title = f"Expense {expense.reference} submitted for review"
    message = (
        f"{maker_name} submitted an expense for {expense.amount} under {expense.category}. "
        f"Purpose: {expense.purpose}. Status: {expense.status}."
    )
    create_notification(
        user=expense.reviewed_by,
        title=title,
        message=message,
        notification_type=NotificationType.EXPENSE_SUBMITTED,
        related_expense=expense,
        action_url=_expense_action_url(expense),
    )
    send_expense_submitted_to_reviewer(
        expense,
        old_status=ExpenseStatus.DRAFT,
        new_status=ExpenseStatus.SUBMITTED,
    )


def _notify_approver(expense):
    maker_name = expense.maker.full_name or expense.maker.username
    title = f"Expense {expense.reference} awaiting final approval"
    message = (
        f"{maker_name}'s expense for {expense.amount} is ready for final approval. "
        f"Category: {expense.category}. Purpose: {expense.purpose}. Status: {expense.status}."
    )
    create_notification(
        user=expense.approved_by,
        title=title,
        message=message,
        notification_type=NotificationType.EXPENSE_REVIEWED,
        related_expense=expense,
        action_url=_expense_action_url(expense),
    )
    send_expense_forwarded_to_approver(
        expense,
        old_status=ExpenseStatus.SUBMITTED,
        new_status=ExpenseStatus.REVIEWED,
    )


def _notify_maker_review_completed(expense):
    title = f"Expense {expense.reference} moved to final approval"
    message = (
        f"Your expense for {expense.amount} was reviewed successfully and sent to "
        f"{expense.approved_by.full_name or expense.approved_by.username} for final approval."
    )
    create_notification(
        user=expense.maker,
        title=title,
        message=message,
        notification_type=NotificationType.EXPENSE_REVIEWED,
        related_expense=expense,
        action_url=_expense_action_url(expense),
    )


def _notify_maker_rejected(expense, actor, stage_label, *, old_status):
    title = f"Expense {expense.reference} rejected"
    message = (
        f"Your expense was rejected during {stage_label} by "
        f"{actor.full_name or actor.username}. Reason: {expense.rejection_reason}."
    )
    create_notification(
        user=expense.maker,
        title=title,
        message=message,
        notification_type=NotificationType.EXPENSE_REJECTED,
        related_expense=expense,
        action_url=_expense_action_url(expense),
    )
    if actor.id == expense.reviewed_by_id:
        send_reviewer_rejection_email(
            expense,
            expense.rejection_reason,
            old_status=old_status,
            new_status=ExpenseStatus.REJECTED,
        )
    else:
        send_approver_rejection_email(
            expense,
            expense.rejection_reason,
            old_status=old_status,
            new_status=ExpenseStatus.REJECTED,
        )


def _notify_maker_approved(expense):
    title = f"Expense {expense.reference} approved"
    message = (
        f"Your expense for {expense.amount} has been approved. "
        "Next step: upload the bill for final verification."
    )
    create_notification(
        user=expense.maker,
        title=title,
        message=message,
        notification_type=NotificationType.EXPENSE_APPROVED,
        related_expense=expense,
        action_url=_expense_action_url(expense),
    )
    send_final_approval_email_to_maker(
        expense,
        old_status=ExpenseStatus.REVIEWED,
        new_status=ExpenseStatus.APPROVED,
    )


def _notify_bill_submitted(expense):
    title = f"Bill submitted for expense {expense.reference}"
    message = (
        f"{expense.maker.full_name or expense.maker.username} uploaded the bill for "
        f"{expense.amount}. Please verify the bill and close the expense if valid."
    )
    create_notification(
        user=expense.reviewed_by,
        title=title,
        message=message,
        notification_type=NotificationType.BILL_PENDING,
        related_expense=expense,
        action_url=_expense_action_url(expense),
    )
    send_bill_submitted_email_to_reviewer(
        expense,
        old_status=ExpenseStatus.APPROVED,
        new_status=ExpenseStatus.BILL_SUBMITTED,
    )


def _notify_maker_closed(expense):
    title = f"Expense {expense.reference} closed"
    message = (
        f"Your expense for {expense.amount} has been closed after bill verification."
    )
    create_notification(
        user=expense.maker,
        title=title,
        message=message,
        notification_type=NotificationType.EXPENSE_APPROVED,
        related_expense=expense,
        action_url=_expense_action_url(expense),
    )
    send_closed_email_to_maker(
        expense,
        old_status=ExpenseStatus.BILL_SUBMITTED,
        new_status=ExpenseStatus.CLOSED,
    )


def _get_anchor_advance_for_maker(maker):
    return get_active_advances_for_maker(maker).first()


@transaction.atomic
def create_advance(*, maker, allocated_by, total_amount, remarks=""):
    _ensure_maker(maker, "maker")
    _ensure_checker(allocated_by, "allocated_by")

    advance = Advance.objects.create(
        reference=_next_reference("ADV", Advance),
        maker=maker,
        allocated_by=allocated_by,
        total_amount=money(total_amount),
        spent_amount=money(0),
        remarks=remarks,
    )

    LedgerEntry.objects.create(
        advance=advance,
        entry_type=LedgerEntryType.ADVANCE,
        amount=advance.total_amount,
        balance_after=advance.balance_amount,
        note="Advance allocated to maker.",
    )
    _log_action(
        action="ADVANCE_ALLOCATED",
        description=f"Advance {advance.reference} allocated to {maker.full_name or maker.username}.",
        actor=allocated_by,
        advance=advance,
        metadata={"total_amount": str(advance.total_amount)},
    )
    return advance


@transaction.atomic
def create_expense(*, advance=None, maker, reviewed_by, approved_by, **payload):
    _ensure_maker(maker, "maker")
    _ensure_checker(reviewed_by, "reviewed_by")
    _ensure_checker(approved_by, "approved_by")

    if advance and advance.maker_id != maker.id:
        raise serializers.ValidationError(
            {"advance": "You can only create expenses against your own advance."}
        )

    amount = money(payload.get("amount"))
    total_available = get_total_available_balance_for_maker(maker)
    if amount > total_available:
        raise serializers.ValidationError(
            {"amount": "Expense amount cannot exceed the total available advance balance."}
        )

    anchor_advance = _get_anchor_advance_for_maker(maker)
    if anchor_advance is None:
        raise serializers.ValidationError(
            {"advance": "No active advance is available for this maker."}
        )

    expense = Expense.objects.create(
        reference=_next_reference("EXP", Expense),
        advance=anchor_advance,
        maker=maker,
        reviewed_by=reviewed_by,
        approved_by=approved_by,
        payable_to=payload["payable_to"],
        expense_date=payload.get("expense_date") or timezone.localdate(),
        amount=amount,
        amount_in_words=payload.get("amount_in_words") or amount_to_words(amount),
        category=payload["category"],
        purpose=payload["purpose"],
        remarks=payload.get("remarks", ""),
    )
    _log_action(
        action="EXPENSE_CREATED",
        description=f"Expense {expense.reference} created against pooled maker balance.",
        actor=maker,
        advance=anchor_advance,
        expense=expense,
        metadata={
            "amount": str(expense.amount),
            "total_available_balance": str(total_available),
            "anchor_advance": anchor_advance.reference,
        },
    )
    return expense


@transaction.atomic
def submit_expense(*, expense, actor):
    if actor.id != expense.maker_id:
        raise serializers.ValidationError("Only the maker can submit this expense.")
    if expense.status != ExpenseStatus.DRAFT:
        raise serializers.ValidationError("Only draft expenses can be submitted.")

    expense.status = ExpenseStatus.SUBMITTED
    expense.submitted_at = timezone.now()
    expense.save(update_fields=["status", "submitted_at", "updated_at"])
    _log_action(
        action="EXPENSE_SUBMITTED",
        description=f"Expense {expense.reference} submitted for checker review.",
        actor=actor,
        advance=expense.advance,
        expense=expense,
    )
    _notify_reviewer(expense)
    return expense


@transaction.atomic
def review_expense(*, expense, actor):
    _ensure_checker(actor, "reviewed_by")
    if expense.status != ExpenseStatus.SUBMITTED:
        raise serializers.ValidationError("Only submitted expenses can be reviewed.")
    if actor.role != UserRole.ADMIN and actor.id != expense.reviewed_by_id:
        raise serializers.ValidationError("Only the assigned reviewer can review this expense.")

    expense.status = ExpenseStatus.REVIEWED
    expense.reviewed_at = timezone.now()
    expense.save(update_fields=["status", "reviewed_at", "updated_at"])
    _log_action(
        action="EXPENSE_REVIEWED",
        description=f"Expense {expense.reference} reviewed by checker.",
        actor=actor,
        advance=expense.advance,
        expense=expense,
    )
    _notify_approver(expense)
    _notify_maker_review_completed(expense)
    return expense


@transaction.atomic
def approve_expense(*, expense, actor):
    _ensure_checker(actor, "approved_by")
    if expense.status != ExpenseStatus.REVIEWED:
        raise serializers.ValidationError("Only reviewed expenses can be approved.")
    if actor.role != UserRole.ADMIN and actor.id != expense.approved_by_id:
        raise serializers.ValidationError("Only the assigned approver can approve this expense.")

    amount = money(expense.amount)
    active_advances = list(get_active_advances_for_maker(expense.maker))
    total_available = get_total_available_balance_for_maker(expense.maker)

    if amount > total_available:
        raise serializers.ValidationError(
            "Expense amount exceeds the remaining pooled advance balance."
        )

    remaining_amount = amount
    allocation_rows = []
    for advance in active_advances:
        if remaining_amount <= money(0):
            break

        available = money(advance.balance_amount)
        if available <= money(0):
            continue

        amount_used = min(available, remaining_amount)
        advance.spent_amount = money(advance.spent_amount) + amount_used
        advance.save()

        allocation = ExpenseAdvanceAllocation.objects.create(
            expense=expense,
            advance=advance,
            amount_used=amount_used,
        )
        allocation_rows.append(allocation)

        LedgerEntry.objects.create(
            advance=advance,
            expense=expense,
            entry_type=LedgerEntryType.SPEND,
            amount=amount_used,
            balance_after=advance.balance_amount,
            note=(
                f"Expense {expense.reference} approved and deducted from pooled advance "
                f"{advance.reference}."
            ),
        )
        remaining_amount = money(remaining_amount - amount_used)

    if remaining_amount > money(0):
        raise serializers.ValidationError(
            "Expense amount exceeds the remaining pooled advance balance."
        )

    primary_advance = allocation_rows[0].advance if allocation_rows else expense.advance

    expense.status = ExpenseStatus.APPROVED
    expense.approved_at = timezone.now()
    expense.advance = primary_advance
    expense.save(update_fields=["advance", "status", "approved_at", "updated_at"])

    _log_action(
        action="EXPENSE_APPROVED",
        description=f"Expense {expense.reference} approved and deducted from pooled advances.",
        actor=actor,
        advance=primary_advance,
        expense=expense,
        metadata={
            "allocations": [
                {
                    "advance_reference": row.advance.reference,
                    "amount_used": str(row.amount_used),
                    "balance_after": str(row.advance.balance_amount),
                }
                for row in allocation_rows
            ]
        },
    )
    _notify_maker_approved(expense)
    return expense


@transaction.atomic
def upload_bill(*, expense, actor, bill_file, payment_mode=None, transaction_reference=None, payment_details=None):
    if actor.id != expense.maker_id:
        raise serializers.ValidationError("Only the maker can upload the bill.")
    if expense.status != ExpenseStatus.APPROVED:
        raise serializers.ValidationError("Bill upload is allowed only for approved expenses.")
    if not bill_file:
        raise serializers.ValidationError({"bill_file": "Bill file is required."})

    payment_mode = str(payment_mode or "").strip()
    transaction_reference = str(transaction_reference or "").strip()
    payment_details = str(payment_details or "").strip()

    if not payment_mode:
        raise serializers.ValidationError(
            {"payment_mode": "Mode of payment is required."}
        )

    if payment_mode == "UPI" and not transaction_reference:
        raise serializers.ValidationError(
            {"transaction_reference": "UTR / Transaction ID is required for UPI payments."}
        )

    if payment_mode == "Bank Transfer" and not transaction_reference:
        raise serializers.ValidationError(
            {"transaction_reference": "Bank reference number is required."}
        )

    if payment_mode == "Other" and not payment_details:
        raise serializers.ValidationError(
            {"payment_details": "Payment details are required for 'Other' payment mode."}
        )
    expense.bill_file = bill_file
    expense.payment_mode = payment_mode
    expense.transaction_reference = transaction_reference or payment_details or ""
    expense.status = ExpenseStatus.BILL_SUBMITTED
    expense.bill_submitted_at = timezone.now()
    try:
        expense.save(
            update_fields=[
                "bill_file",
                "payment_mode",
                "transaction_reference",
                "status",
                "bill_submitted_at",
                "updated_at",
            ]
        )
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.message_dict) from exc
    _log_action(
        action="BILL_UPLOADED",
        description=f"Bill uploaded for expense {expense.reference}.",
        actor=actor,
        advance=expense.advance,
        expense=expense,
    )
    _notify_bill_submitted(expense)
    return expense


@transaction.atomic
def close_expense(*, expense, actor):
    _ensure_checker(actor, "closed_by")
    if expense.status != ExpenseStatus.BILL_SUBMITTED:
        raise serializers.ValidationError(
            "Only bill-submitted expenses can be closed."
        )
    if actor.role != UserRole.ADMIN and actor.id != expense.reviewed_by_id:
        raise serializers.ValidationError(
            "Only the assigned reviewer can close this bill submission."
        )

    expense.status = ExpenseStatus.CLOSED
    expense.closed_at = timezone.now()
    expense.save(update_fields=["status", "closed_at", "updated_at"])

    advance = expense.advance
    if advance.balance_amount == money(0):
        advance.status = AdvanceStatus.CLOSED
        advance.save()
    _log_action(
        action="EXPENSE_CLOSED",
        description=f"Expense {expense.reference} closed after bill verification.",
        actor=actor,
        advance=advance,
        expense=expense,
    )
    _notify_maker_closed(expense)
    return expense


@transaction.atomic
def reject_expense(*, expense, actor, rejection_reason):
    _ensure_checker(actor, "rejected_by")
    if expense.status not in {ExpenseStatus.SUBMITTED, ExpenseStatus.REVIEWED}:
        raise serializers.ValidationError(
            "Only submitted or reviewed expenses can be rejected."
        )
    if (
        expense.status == ExpenseStatus.SUBMITTED
        and actor.role != UserRole.ADMIN
        and actor.id != expense.reviewed_by_id
    ):
        raise serializers.ValidationError("Only the assigned reviewer can reject this expense.")
    if (
        expense.status == ExpenseStatus.REVIEWED
        and actor.role != UserRole.ADMIN
        and actor.id != expense.approved_by_id
    ):
        raise serializers.ValidationError("Only the assigned approver can reject this expense.")

    reason = str(rejection_reason or "").strip()
    if not reason:
        raise serializers.ValidationError(
            {"rejection_reason": "Rejection message is required."}
        )

    old_status = expense.status
    expense.status = ExpenseStatus.REJECTED
    expense.rejection_reason = reason
    expense.save(update_fields=["status", "rejection_reason", "updated_at"])
    _log_action(
        action="EXPENSE_REJECTED",
        description=f"Expense {expense.reference} rejected: {reason}",
        actor=actor,
        advance=expense.advance,
        expense=expense,
        metadata={"rejection_reason": reason},
    )
    stage_label = "review" if actor.id == expense.reviewed_by_id else "approval"
    _notify_maker_rejected(expense, actor, stage_label, old_status=old_status)
    return expense