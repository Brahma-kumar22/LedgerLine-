"""
transactions/admin.py
"""

from django.contrib import admin

from .models import Transaction
from .idempotency import IdempotencyRecord
from .attempts import TransactionAttempt


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display    = ("reference", "transaction_type", "amount", "currency", "status", "initiated_by", "created_at")
    list_filter     = ("transaction_type", "status", "currency")
    search_fields   = ("reference", "initiated_by__username")
    readonly_fields = ("id", "reference", "created_at", "updated_at")
    ordering        = ("-created_at",)

    def has_delete_permission(self, request, obj=None) -> bool:
        """Transactions must never be deleted through the admin panel."""
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        """
        Completed/reversed transactions are immutable.
        Allow changes only to PENDING/FAILED records for admin corrections.
        For full immutability the pre_save signal and PostgreSQL trigger
        provide the enforcement; this is an additional UI guardrail.
        """
        if obj and obj.status in (Transaction.Status.COMPLETED, Transaction.Status.REVERSED):
            return False
        return True


@admin.register(IdempotencyRecord)
class IdempotencyRecordAdmin(admin.ModelAdmin):
    list_display    = ("idempotency_key", "user", "status", "transaction", "created_at")
    list_filter     = ("status",)
    search_fields   = ("idempotency_key", "user__username")
    readonly_fields = ("id", "user", "idempotency_key", "request_hash", "created_at", "updated_at")

    def has_add_permission(self, request) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(TransactionAttempt)
class TransactionAttemptAdmin(admin.ModelAdmin):
    list_display    = ("id", "transaction_type", "outcome", "initiated_by", "account", "amount", "created_at")
    list_filter     = ("outcome", "transaction_type")
    search_fields   = ("initiated_by__username",)
    readonly_fields = ("id", "initiated_by", "transaction_type", "account", "amount",
                       "currency", "outcome", "failure_reason", "transaction",
                       "idempotency_record", "created_at")

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
