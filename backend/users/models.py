"""
users/models.py

Custom user model for MONVEX.

Extends Django's AbstractUser so we keep all built-in authentication
features (password hashing, login, sessions, admin, permissions) and add
the MONVEX role system on top.

SECURITY RULES:
    - Public registration ALWAYS creates ACCOUNT_HOLDER users.
    - Public registration NEVER accepts a role from the request body.
    - ADMIN and AUDITOR accounts are provisioned only via the
      bootstrap_admin management command or by an authenticated ADMIN
      through the Django admin panel.
    - Passwords are hashed by Django's create_user() (PBKDF2-SHA256).
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    MONVEX custom user model.

    UUID primary key: does not expose sequential record counts and is
    harder to enumerate than auto-incrementing integers.

    Inherits from AbstractUser, which already provides:
        username, first_name, last_name, email
        password (hashed), is_active, is_staff, is_superuser
        last_login, date_joined
        groups, user_permissions
    """

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    class Role(models.TextChoices):
        """
        The three roles in MONVEX.

        ADMIN          — Full system access. Created only by bootstrap_admin
                         management command or by an existing ADMIN in the
                         Django admin panel. Never via public registration.
        ACCOUNT_HOLDER — Normal end user. The only role public registration
                         may produce.
        AUDITOR        — Read-only access to audit trails and ledger. Created
                         by an ADMIN. Never self-assigned.
        """
        ADMIN          = "ADMIN",          _("Admin")
        ACCOUNT_HOLDER = "ACCOUNT_HOLDER", _("Account Holder")
        AUDITOR        = "AUDITOR",        _("Auditor")

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="UUID primary key. Generated automatically on creation.",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ACCOUNT_HOLDER,
        db_index=True,
        help_text=(
            "MONVEX role. Defaults to ACCOUNT_HOLDER. "
            "Privileged roles assigned only by administrators."
        ),
    )

    # NOTE: AbstractUser already provides date_joined (auto-set on creation).
    # We do NOT add created_at because it would be an exact duplicate of
    # date_joined, creating two columns with identical data.
    # Use date_joined everywhere creation time is needed.

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the most recent change to this user record.",
    )

    # ------------------------------------------------------------------
    # Role convenience properties
    # ------------------------------------------------------------------

    @property
    def is_admin(self) -> bool:
        """True when this user holds the ADMIN role."""
        return self.role == self.Role.ADMIN

    @property
    def is_account_holder(self) -> bool:
        """True when this user holds the ACCOUNT_HOLDER role."""
        return self.role == self.Role.ACCOUNT_HOLDER

    @property
    def is_auditor(self) -> bool:
        """True when this user holds the AUDITOR role."""
        return self.role == self.Role.AUDITOR

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["username"]
        indexes = [
            models.Index(fields=["role"],  name="user_role_idx"),
            models.Index(fields=["email"], name="user_email_idx"),
        ]
