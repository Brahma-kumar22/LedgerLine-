"""
audit/admin.py

AuditLog is read-only in the admin — entries are immutable by design.
"""

from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display    = ("id", "event_type", "actor", "resource_type", "resource_id", "ip_address", "created_at")
    list_filter     = ("event_type", "resource_type")
    search_fields   = ("resource_id", "actor__username", "event_type")
    readonly_fields = (
        "id", "actor", "event_type", "resource_type",
        "resource_id", "metadata", "ip_address", "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
