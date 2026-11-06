"""
transactions/attempts.py

TransactionAttempt model for MONVEX.

PURPOSE:
--------
Every attempt to initiate a financial operation is recorded here,
regardless of whether it succeeds, fails, or is refused.

A refused attempt does NOT produce a Transaction row (no financial posting
occurs).  But it MUST appear in the audit trail so that:
    - Fraud investigators can see repeated failed withdrawal attempts.
    - Compliance auditors can verify that balance checks were run.
    - Support staff can diagnose why a legitimate request was rejected.

This is distinct from Transaction.failure_reason, which is only populated
when a Transaction row WAS created but the processing failed mid-flight.

OUTCOMES:
---------
SUCCESS  — A Transaction was created and completed successfully.
FAILED   — A Transaction was created but failed during processing.
REFUSED  — The attempt was rejected before a Transaction was created
            (e.g. insufficient funds, inactive account, authorization denied,
             idempotency key conflict, invalid amount).
"""

import uuid

from django.conf import settings
from django.db import models


class TransactionAttempt(models.Model):
    """
    Records every attempt to initiate a financial operation.

    Append-only.  Never updated or deleted after creation.
    Enforced by a pre_save signal in transactions/apps.py and a
    PostgreSQL trigger installed by a data migration.
    """

    class Outcome(models.TextChoices):
        SUCCESS = "SUCCESS", "Success"
        FAILED  = "FAILED",  "Failed"
        REFUSED = "REFUSED", "Refused"

    class TransactionType(models.TextChoices):
        DEPOSIT    = "DEPOSIT",    "Deposit"
        WITHDRAWAL = "WITHDRAWAL", "Withdrawal"
        TRANSFER   = "TRANSFER",   "Transfer"
        REVERSAL   = "REVERSAL",   "Reversal"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="transaction_attempts",
        help_text="The user who submitted this request.",
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        db_index=True,
    )

    # The account that was the primary subject of this attempt.
    # For deposits: destination account.
    # For withdrawals/transfers: source account.
    # Null if the account could not be identified (e.g. account not found).
    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_attempts",
        help_text="The primary account involved in this attempt.",
    )

    # Amount the caller requested (may not have been applied if refused).
    amount = models.DecimalField(
        max_digits=19,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Requested amount. Null if parsing failed before extraction.",
    )

    currency = models.CharField(
        max_length=3,
        blank=True,
        default="USD",
    )

    outcome = models.CharField(
        max_length=10,
        choices=Outcome.choices,
        db_index=True,
    )

    # Reason the attempt was refused or failed.  Empty for successful attempts.
    failure_reason = models.TextField(
        blank=True,
        default="",
        help_text="Why this attempt was refused or failed. Empty for success.",
    )

    # FK to the Transaction that was created, if any.
    # Null for REFUSED attempts (no Transaction row created).
    transaction = models.ForeignKey(
        "transactions.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attempts",
        help_text="The Transaction created by this attempt. Null for refused attempts.",
    )

    # FK to the IdempotencyRecord associated with this request, if any.
    idempotency_record = models.ForeignKey(
        "transactions.IdempotencyRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attempts",
        help_text="The idempotency record for this request, if one was used.",
    )

    # Immutable timestamp — never updated.
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When this attempt was recorded. Immutable.",
    )

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        user = self.initiated_by.username if self.initiated_by else "unknown"
        return f"[{self.outcome}] {self.transaction_type} by {user} at {self.created_at}"

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "Transaction Attempt"
        verbose_name_plural = "Transaction Attempts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["initiated_by", "-created_at"], name="attempt_user_date_idx"),
            models.Index(fields=["account",      "-created_at"], name="attempt_acct_date_idx"),
            models.Index(fields=["outcome",      "-created_at"], name="attempt_outcome_date_idx"),
        ]
