"""
users/admin.py

Django admin registration for the MONVEX custom User model.

Extends UserAdmin so all built-in password-change forms, permission
management, and group management continue to work correctly.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Admin configuration for the MONVEX User model.

    Adds the 'role' field to the display, list filters, and edit forms
    while preserving all standard Django user admin functionality.
    """

    # Columns shown in the changelist (user list) view.
    list_display = (
        "username", "email", "first_name", "last_name",
        "role", "is_staff", "is_active", "date_joined",
    )

    # Right-hand sidebar filters.
    list_filter = ("role", "is_staff", "is_active", "is_superuser")

    # ------------------------------------------------------------------
    # Edit form fieldsets
    # The standard UserAdmin fieldsets are replaced to:
    #   1. Add the MONVEX Role section.
    #   2. Show date_joined, last_login, and updated_at in a Timestamps
    #      section so they are actually visible (previously they were in
    #      readonly_fields but not in any fieldset — Django silently ignores
    #      readonly fields that are not listed in a fieldset).
    # ------------------------------------------------------------------
    fieldsets = (
        (None,                 {"fields": ("username", "password")}),
        (_("MONVEX Role"),     {"fields": ("role",)}),
        (_("Personal Info"),   {"fields": ("first_name", "last_name", "email")}),
        (_("Permissions"),     {
            "fields": (
                "is_active", "is_staff", "is_superuser",
                "groups", "user_permissions",
            ),
        }),
        (_("Timestamps"),      {"fields": ("date_joined", "last_login", "updated_at")}),
    )

    # "Add user" creation form — ask for role upfront.
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "role", "password1", "password2"),
        }),
    )

    # All timestamp fields are set automatically — never manually editable.
    readonly_fields = ("date_joined", "last_login", "updated_at")

    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)
