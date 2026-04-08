from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from common.choices import (
    AdvanceStatus,
    ExpenseStatus,
    LedgerEntryType,
    NotificationType,
    UserRole,
)
from common.utils import amount_to_words, get_allowed_expense_date_range, money

ALLOWED_BILL_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
DEFAULT_MAX_BILL_UPLOAD_SIZE = 5 * 1024 * 1024


def is_checker_or_admin(user):
    return user.role in {UserRole.CHECKER, UserRole.ADMIN}


def validate_bill_file(file_obj):
    if not file_obj:
        return

    file_name = (getattr(file_obj, "name", "") or "").lower()
    file_size = getattr(file_obj, "size", 0) or 0
    file_extension = ""

    if "." in file_name:
        file_extension = file_name[file_name.rfind(".") :]

    if file_extension not in ALLOWED_BILL_EXTENSIONS:
        allowed_formats = ", ".join(sorted(ALLOWED_BILL_EXTENSIONS))
        raise ValidationError(
            {"bill_file": f"Only {allowed_formats} files are allowed for bill uploads."}
        )

    max_size = getattr(
        settings,
        "MAX_BILL_UPLOAD_SIZE",
        DEFAULT_MAX_BILL_UPLOAD_SIZE,
    )
    if file_size > max_size:
        raise ValidationError(
            {
                "bill_file": (
                    f"Bill file must be {max_size // (1024 * 1024)} MB or smaller."
                )
            }
        )


class Advance(models.Model):
    reference = models.CharField(max_length=30, unique=True)
    maker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="advances",
    )
    allocated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="allocated_advances",
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    spent_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=AdvanceStatus.choices,
        default=AdvanceStatus.ACTIVE,
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def _str_(self):
        return self.reference

    def clean(self):
        if self.maker_id and self.maker.role != UserRole.MAKER:
            raise ValidationError({"maker": "Advance maker must be a maker user."})
        if self.allocated_by_id and not is_checker_or_admin(self.allocated_by):
            raise ValidationError(
                {"allocated_by": "Advance allocator must be a checker or admin user."}
            )
        if money(self.total_amount) <= 0:
            raise ValidationError({"total_amount": "Total amount must be greater than zero."})
        if money(self.spent_amount) < 0:
            raise ValidationError({"spent_amount": "Spent amount cannot be negative."})
        if money(self.spent_amount) > money(self.total_amount):
            raise ValidationError(
                {"spent_amount": "Spent amount cannot exceed total amount."}
            )

    def refresh_financials(self):
        self.total_amount = money(self.total_amount)
        self.spent_amount = money(self.spent_amount)
        self.balance_amount = money(self.total_amount) - money(self.spent_amount)

        if self.balance_amount <= 0:
            self.balance_amount = money(0)
            if self.status != AdvanceStatus.CLOSED:
                self.status = AdvanceStatus.EXHAUSTED
        elif self.spent_amount > 0:
            self.status = AdvanceStatus.PARTIALLY_USED
        else:
            self.status = AdvanceStatus.ACTIVE

    def save(self, *args, **kwargs):
        self.refresh_financials()
        self.full_clean()
        super().save(*args, **kwargs)


def get_active_advances_for_maker(maker):
    if not maker:
        return Advance.objects.none()
    return Advance.objects.filter(
        maker=maker,
        balance_amount__gt=0,
    ).order_by("created_at", "id")


def get_total_available_balance_for_maker(maker):
    if not maker:
        return money(0)
    total = get_active_advances_for_maker(maker).aggregate(total=Sum("balance_amount"))["total"]
    return money(total)


class Expense(models.Model):
    reference = models.CharField(max_length=30, unique=True)
    advance = models.ForeignKey(
        Advance,
        on_delete=models.PROTECT,
        related_name="expenses",
    )
    maker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="expenses",
    )
    payable_to = models.CharField(max_length=255)
    expense_date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_in_words = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255)
    purpose = models.TextField()
    payment_mode = models.CharField(max_length=50, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="expenses_to_review",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="expenses_to_approve",
    )
    status = models.CharField(
        max_length=20,
        choices=ExpenseStatus.choices,
        default=ExpenseStatus.DRAFT,
    )
    bill_file = models.FileField(
        upload_to="expense_bills/%Y/%m/%d/",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    bill_submitted_at = models.DateTimeField(blank=True, null=True)
    closed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def _str_(self):
        return self.reference

    def clean(self):
        if self.maker_id and self.maker.role != UserRole.MAKER:
            raise ValidationError({"maker": "Expense maker must be a maker user."})
        if self.advance_id and self.maker_id and self.advance.maker_id != self.maker_id:
            raise ValidationError({"maker": "Expense maker must match the advance maker."})
        if self.reviewed_by_id and not is_checker_or_admin(self.reviewed_by):
            raise ValidationError({"reviewed_by": "Reviewed by must be a checker or admin user."})
        if self.approved_by_id and not is_checker_or_admin(self.approved_by):
            raise ValidationError({"approved_by": "Approved by must be a checker or admin user."})
        if money(self.amount) <= 0:
            raise ValidationError({"amount": "Expense amount must be greater than zero."})
        min_date, max_date = get_allowed_expense_date_range()
        if self.expense_date and not (min_date <= self.expense_date <= max_date):
            raise ValidationError(
                {
                    "expense_date": (
                        f"Expense date must be between {min_date.isoformat()} and {max_date.isoformat()}."
                    )
                }
            )
        if self.payment_mode == "UPI" and not self.transaction_reference.strip():
            raise ValidationError(
                {"transaction_reference": "UTR ID / TR ID is required for UPI payments."}
            )
        validate_bill_file(self.bill_file)

    def save(self, *args, **kwargs):
        self.amount = money(self.amount)
        if not self.amount_in_words:
            self.amount_in_words = amount_to_words(self.amount)
        self.full_clean()
        super().save(*args, **kwargs)


class ExpenseAdvanceAllocation(models.Model):
    expense = models.ForeignKey(
        Expense,
        on_delete=models.CASCADE,
        related_name="advance_allocations",
    )
    advance = models.ForeignKey(
        Advance,
        on_delete=models.PROTECT,
        related_name="expense_allocations",
    )
    amount_used = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["expense", "advance"],
                name="finance_expense_allocation_unique_expense_advance",
            )
        ]

    def _str_(self):
        return f"{self.expense.reference} -> {self.advance.reference}"

    def clean(self):
        if money(self.amount_used) <= 0:
            raise ValidationError({"amount_used": "Allocated amount must be greater than zero."})

    def save(self, *args, **kwargs):
        self.amount_used = money(self.amount_used)
        self.full_clean()
        super().save(*args, **kwargs)


class LedgerEntry(models.Model):
    advance = models.ForeignKey(
        Advance,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )
    expense = models.ForeignKey(
        Expense,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ledger_entries",
    )
    entry_type = models.CharField(max_length=20, choices=LedgerEntryType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def _str_(self):
        return f"{self.advance.reference} - {self.entry_type}"

    def clean(self):
        if money(self.amount) < 0:
            raise ValidationError({"amount": "Ledger amount cannot be negative."})
        if money(self.balance_after) < 0:
            raise ValidationError({"balance_after": "Balance after cannot be negative."})

    def save(self, *args, **kwargs):
        self.amount = money(self.amount)
        self.balance_after = money(self.balance_after)
        self.full_clean()
        super().save(*args, **kwargs)


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    advance = models.ForeignKey(
        Advance,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    expense = models.ForeignKey(
        Expense,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50)
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def _str_(self):
        target = self.expense.reference if self.expense_id else self.advance.reference if self.advance_id else "system"
        return f"{self.action} - {target}"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )
    related_expense = models.ForeignKey(
        Expense,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    action_url = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def _str_(self):
        return f"{self.user.username} - {self.title}"