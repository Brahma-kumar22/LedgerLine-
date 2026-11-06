"""
accounts/admin.py
"""

from django.contrib import admin

from .models import Account, AccountAccess


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display   = ("account_number", "name", "account_type", "owner", "currency", "balance", "is_active", "created_at")
    list_filter    = ("account_type", "currency", "is_active")
    search_fields  = ("account_number", "name", "owner__username", "owner__email")
    readonly_fields = ("id", "account_number", "created_at", "updated_at")
    ordering       = ("owner__username", "name")


@admin.register(AccountAccess)
class AccountAccessAdmin(admin.ModelAdmin):
    list_display  = ("account", "user", "permission", "granted_by", "granted_at")
    list_filter   = ("permission",)
    search_fields = ("account__account_number", "user__username")
    readonly_fields = ("id", "granted_at")
