"""
transactions/models.py

Re-exports all transaction-domain models so Django's app registry discovers
them from a single import point.

Each model is defined in its own module for readability:
    transactions/models.py        — Transaction (this file re-exports it)
    transactions/idempotency.py   — IdempotencyRecord
    transactions/attempts.py      — TransactionAttempt
"""

# Re-export so 'from transactions.models import ...' works everywhere.
from .idempotency import IdempotencyRecord  # noqa: F401
from .attempts import TransactionAttempt    # noqa: F401

import uuid

from django.conf import settings
from django.db import models


class Transaction(models.Model):
    """
    One financial transaction.

    Links to two or more LedgerEntry rows that record the accounting effect.

    STATUS MACHINE:
        PENDING   → COMPLETED   (happy path)
        PENDING   → FAILED      (processing error)
        COMPLETED → REVERSED    (original marked REVERSED; reversal is a new Transaction)

    COMPLETED and REVERSED are terminal — see pre_save signal in apps.py
    and the PostgreSQL trigger in the trigger migration.

    CONSERVATION INVARIANT FOR INTERNAL TRANSFERS:
        sum(CREDIT amounts) == sum(DEBIT amounts) for the same transaction.
        Net effect on total system money: zero.

    EXTERNAL DEPOSITS / WITHDRAWALS:
        A deposit credits one real account and debits a notional
        EXTERNAL_FUNDING account.  A withdrawal does the reverse.
        This keeps the double-entry books balanced.
    """

    class TransactionType(models.TextChoices):
        DEPOSIT    = "DEPOSIT",    "Deposit"
        WITHDRAWAL = "WITHDRAWAL", "Withdrawal"
        TRANSFER   = "TRANSFER",   "Transfer"
        REVERSAL   = "REVERSAL",   "Reversal"

    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        COMPLETED = "COMPLETED", "Completed"
        FAILED    = "FAILED",    "Failed"
        REVERSED  = "REVERSED",  "Reversed"

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # Human-readable unique reference (e.g. TXN-20261106-ABCD1234).
    reference = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique transaction reference for support lookups.",
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        db_index=True,
    )

    # Always positive.  Direction is on LedgerEntry.entry_type.
    amount = models.DecimalField(
        max_digits=19,
        decimal_places=2,
        help_text="Always positive. Never use float for monetary values.",
    )

    currency = models.CharField(
        max_length=3,
        default="USD",
    )

    # WITHDRAWAL / TRANSFER: account funds leave.  Null for DEPOSIT.
    source_account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.PROTECT,
        related_name="outgoing_transactions",
        null=True,
        blank=True,
        help_text="Account debited. Null for deposits.",
    )

    # DEPOSIT / TRANSFER: account funds enter.  Null for WITHDRAWAL.
    destination_account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.PROTECT,
        related_name="incoming_transactions",
        null=True,
        blank=True,
        help_text="Account credited. Null for withdrawals.",
    )

    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="initiated_transactions",
        help_text="The authenticated user who created this transaction.",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    failure_reason = models.TextField(
        blank=True,
        default="",
        help_text="Populated when status=FAILED.",
    )

    # For REVERSAL type: FK to the original transaction being reversed.
    reversed_transaction = models.OneToOneField(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reversal",
        help_text="For REVERSAL type only: the original transaction this reverses.",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        return (
            f"{self.reference} — {self.transaction_type} "
            f"{self.amount} {self.currency} [{self.status}]"
        )

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source_account",      "-created_at"], name="txn_src_date_idx"),
            models.Index(fields=["destination_account", "-created_at"], name="txn_dst_date_idx"),
            models.Index(fields=["initiated_by",        "-created_at"], name="txn_user_date_idx"),
            models.Index(fields=["status",              "-created_at"], name="txn_status_date_idx"),
            models.Index(fields=["transaction_type",    "-created_at"], name="txn_type_date_idx"),
        ]
        constraints = [
            # Amount must be strictly positive.
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="transaction_amount_positive",
            ),
            # DEPOSIT requires a destination account.
            models.CheckConstraint(
                condition=(
                    ~models.Q(transaction_type="DEPOSIT") |
                    models.Q(destination_account__isnull=False)
                ),
                name="deposit_requires_destination",
            ),
            # WITHDRAWAL requires a source account.
            models.CheckConstraint(
                condition=(
                    ~models.Q(transaction_type="WITHDRAWAL") |
                    models.Q(source_account__isnull=False)
                ),
                name="withdrawal_requires_source",
            ),
            # TRANSFER requires both accounts.
            models.CheckConstraint(
                condition=(
                    ~models.Q(transaction_type="TRANSFER") |
                    (
                        models.Q(source_account__isnull=False) &
                        models.Q(destination_account__isnull=False)
                    )
                ),
                name="transfer_requires_both_accounts",
            ),
            # TRANSFER: source and destination must differ.
            models.CheckConstraint(
                condition=(
                    ~models.Q(transaction_type="TRANSFER") |
                    ~models.Q(source_account=models.F("destination_account"))
                ),
                name="transfer_accounts_must_differ",
            ),
        ]
