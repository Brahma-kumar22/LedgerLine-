"""
audit/models.py

Immutable audit trail for MONVEX.

PURPOSE:
--------
Every significant system event produces one AuditLog row.  The audit log
is the legal record of what happened, who did it, and when.

AuditLog rows are append-only.  They must NEVER be updated or deleted.
Enforcement:
    1. pre_save signal in audit/apps.py — blocks ORM-level updates.
    2. PostgreSQL trigger in a data migration — blocks raw SQL updates.

WHAT NOT TO STORE IN METADATA:
--------------------------------
Never store the following in the metadata JSON field:
    - Passwords (hashed or otherwise)
    - JWT tokens or session keys
    - Full database connection strings
    - Any value from the .env file

Safe to store: user IDs, account numbers, transaction references, amounts,
currencies, IP addresses, role names, error codes, and status transitions.

EVENT COVERAGE:
---------------
The event types below cover all required audit scenarios:
    Authentication: LOGIN_SUCCESS, LOGIN_FAILED, TOKEN_REFRESHED, LOGOUT
    Authorization:  ACCESS_DENIED, PERMISSION_GRANTED, PERMISSION_REVOKED
    Accounts:       ACCOUNT_CREATED, ACCOUNT_DEACTIVATED, ACCOUNT_REACTIVATED
    Transactions:   TRANSACTION_CREATED, TRANSACTION_COMPLETED,
                    TRANSACTION_FAILED, TRANSACTION_REVERSED
    Ledger:         LEDGER_ENTRY_WRITTEN, LEDGER_INTEGRITY_VIOLATION
    Idempotency:    IDEMPOTENCY_REPLAY, IDEMPOTENCY_CONFLICT
    Users:          USER_REGISTERED, USER_ROLE_CHANGED, USER_DEACTIVATED
    Admin:          ADMIN_ACTION, BOOTSTRAP_ADMIN_CREATED
"""

import uuid

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    A single immutable audit trail entry.

    Written by Django post_save signals registered in each app's apps.py.
    Never updated or deleted after creation.
    """

    class EventType(models.TextChoices):
        # Authentication
        LOGIN_SUCCESS          = "LOGIN_SUCCESS",          "Login Success"
        LOGIN_FAILED           = "LOGIN_FAILED",           "Login Failed"
        TOKEN_REFRESHED        = "TOKEN_REFRESHED",        "Token Refreshed"
        LOGOUT                 = "LOGOUT",                 "Logout"

        # Authorization
        ACCESS_DENIED          = "ACCESS_DENIED",          "Access Denied"
        PERMISSION_GRANTED     = "PERMISSION_GRANTED",     "Permission Granted"
        PERMISSION_REVOKED     = "PERMISSION_REVOKED",     "Permission Revoked"

        # Account lifecycle
        ACCOUNT_CREATED        = "ACCOUNT_CREATED",        "Account Created"
        ACCOUNT_DEACTIVATED    = "ACCOUNT_DEACTIVATED",    "Account Deactivated"
        ACCOUNT_REACTIVATED    = "ACCOUNT_REACTIVATED",    "Account Reactivated"

        # Financial events
        TRANSACTION_CREATED    = "TRANSACTION_CREATED",    "Transaction Created"
        TRANSACTION_COMPLETED  = "TRANSACTION_COMPLETED",  "Transaction Completed"
        TRANSACTION_FAILED     = "TRANSACTION_FAILED",     "Transaction Failed"
        TRANSACTION_REVERSED   = "TRANSACTION_REVERSED",   "Transaction Reversed"

        # Ledger
        LEDGER_ENTRY_WRITTEN   = "LEDGER_ENTRY_WRITTEN",   "Ledger Entry Written"
        LEDGER_INTEGRITY_VIOLATION = "LEDGER_INTEGRITY_VIOLATION", "Ledger Integrity Violation"

        # Idempotency
        IDEMPOTENCY_REPLAY     = "IDEMPOTENCY_REPLAY",     "Idempotency Replay"
        IDEMPOTENCY_CONFLICT   = "IDEMPOTENCY_CONFLICT",   "Idempotency Conflict"

        # User lifecycle
        USER_REGISTERED        = "USER_REGISTERED",        "User Registered"
        USER_ROLE_CHANGED      = "USER_ROLE_CHANGED",      "User Role Changed"
        USER_DEACTIVATED       = "USER_DEACTIVATED",       "User Deactivated"

        # Administrative
        ADMIN_ACTION           = "ADMIN_ACTION",           "Admin Action"
        BOOTSTRAP_ADMIN_CREATED = "BOOTSTRAP_ADMIN_CREATED", "Bootstrap Admin Created"

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # Null for system-generated events (e.g. scheduled jobs, triggers).
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        help_text="The user who caused this event. Null for system/automated events.",
    )

    event_type = models.CharField(
        max_length=60,
        choices=EventType.choices,
        db_index=True,
    )

    # Plain string model name (e.g. "Transaction", "Account").
    # Using ContentType FK would be more powerful but adds complexity;
    # this is sufficient for the current requirements.
    resource_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text='Model name of the affected object, e.g. "Transaction".',
    )

    # Primary key of the affected object as a string.
    resource_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        help_text="UUID or other PK of the affected resource.",
    )

    # Structured context for this event.
    # MUST NOT contain passwords, tokens, or raw connection strings.
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Event-specific context. "
            "Safe values only — never store secrets, passwords, or tokens."
        ),
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="Client IP address at the time of the event.",
    )

    # Immutable creation timestamp.
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When this event was recorded. Immutable.",
    )

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        actor_label = self.actor.username if self.actor_id else "system"
        return f"[{self.event_type}] by {actor_label} at {self.created_at}"

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["resource_type", "resource_id"], name="audit_resource_idx"),
            models.Index(fields=["actor",         "-created_at"], name="audit_actor_date_idx"),
            models.Index(fields=["event_type",    "-created_at"], name="audit_type_date_idx"),
        ]
