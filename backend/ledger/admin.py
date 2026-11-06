"""
ledger/admin.py

LedgerEntry is read-only in the admin — entries are immutable by design.
"""

from django.contrib import admin

from .models import LedgerEntry


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display    = ("id", "entry_type", "amount", "currency", "account", "balance_after", "transaction", "created_at")
    list_filter     = ("entry_type", "currency")
    search_fields   = ("account__account_number", "transaction__reference")
    readonly_fields = (
        "id", "transaction", "account", "entry_type",
        "amount", "currency", "balance_after", "initiated_by", "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
