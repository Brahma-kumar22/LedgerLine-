"""
ledger/models.py

Double-entry ledger model for MONVEX.

DOUBLE-ENTRY RULES:
-------------------
Every completed financial event produces exactly two LedgerEntry rows:
    One DEBIT  — money leaving an account (or entering a liability account).
    One CREDIT — money entering an account (or leaving a liability account).

For every Transaction, the sum of all DEBIT amounts must equal the sum of
all CREDIT amounts.  This is the fundamental money-conservation rule.

EXTERNAL DEPOSITS AND WITHDRAWALS:
-----------------------------------
External deposits and withdrawals are represented using notional accounts:

    Deposit:
        DEBIT  → EXTERNAL_FUNDING account  (notional; represents inflow)
        CREDIT → real customer account

    Withdrawal:
        DEBIT  → real customer account
        CREDIT → EXTERNAL_SETTLEMENT account  (notional; represents outflow)

This keeps every transaction balanced (debits == credits) without requiring
actual external bank accounts in the database.  The EXTERNAL_FUNDING and
EXTERNAL_SETTLEMENT accounts are created by the bootstrap_admin command and
are owned by the ADMIN user.  They are system accounts, not customer accounts.

CONSERVATION INVARIANT (TESTABLE):
    For any completed Transaction T:
        sum(entry.amount for entry in T.ledger_entries.filter(entry_type="DEBIT"))
        ==
        sum(entry.amount for entry in T.ledger_entries.filter(entry_type="CREDIT"))

IMMUTABILITY:
-------------
LedgerEntry rows must NEVER be updated or deleted after creation.
Two enforcement layers:
    1. pre_save signal in ledger/apps.py — catches ORM-level updates.
    2. PostgreSQL trigger installed by a data migration — catches raw SQL.
Neither layer alone is sufficient: signals can be bypassed by QuerySet.update();
raw SQL bypasses signals entirely.  Both layers together provide defence-in-depth.

NOTE on CheckConstraints and cross-row balance:
    Django CheckConstraints operate per-row and cannot verify that a DEBIT row
    is paired with a matching CREDIT row (that requires reading two rows).
    Cross-row balance is enforced in the transaction service layer inside
    atomic() and validated before commit.  A PostgreSQL trigger on the
    Transaction table (on UPDATE to status=COMPLETED) that verifies the
    debit/credit balance for that transaction_id would be the strongest
    DB-level enforcement, but is planned for a future migration.
"""

import uuid

from django.conf import settings
from django.db import models


class LedgerEntry(models.Model):
    """
    A single immutable line in the double-entry ledger.

    Created in pairs (one DEBIT + one CREDIT) inside an atomic block.
    Once written, never modified or deleted.
    """

    class EntryType(models.TextChoices):
        DEBIT  = "DEBIT",  "Debit"
        CREDIT = "CREDIT", "Credit"

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    transaction = models.ForeignKey(
        "transactions.Transaction",
        on_delete=models.PROTECT,   # Never cascade-delete ledger history.
        related_name="ledger_entries",
        help_text="The transaction that produced this entry.",
    )

    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.PROTECT,
        related_name="ledger_entries",
        help_text="The account this entry is recorded against.",
    )

    entry_type = models.CharField(
        max_length=6,
        choices=EntryType.choices,
        help_text="DEBIT or CREDIT.",
    )

    # Always positive — direction is conveyed by entry_type.
    amount = models.DecimalField(
        max_digits=19,
        decimal_places=2,
        help_text="Always positive. Direction expressed by entry_type.",
    )

    currency = models.CharField(
        max_length=3,
        default="USD",
    )

    # Denormalised running balance on this account immediately after this
    # entry was applied.  Set atomically inside the same DB transaction
    # that creates this row.  Allows fast account-statement generation
    # without replaying full entry history.
    balance_after = models.DecimalField(
        max_digits=19,
        decimal_places=2,
        help_text=(
            "Account balance immediately after this entry. "
            "Set atomically with this row's creation."
        ),
    )

    # Who initiated the operation that produced this entry.
    # Denormalised from Transaction.initiated_by for faster audit queries.
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ledger_entries",
        help_text="The user whose action produced this entry.",
    )

    # Immutable creation timestamp.
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When this entry was written. Immutable.",
    )

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        return (
            f"{self.entry_type} {self.amount} {self.currency} "
            f"on {self.account_id} (txn {self.transaction_id})"
        )

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "Ledger Entry"
        verbose_name_plural = "Ledger Entries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["account",     "-created_at"], name="ledger_acct_date_idx"),
            models.Index(fields=["transaction"],                name="ledger_txn_idx"),
            models.Index(fields=["initiated_by","-created_at"], name="ledger_user_date_idx"),
        ]
        constraints = [
            # Amount must be strictly positive.
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="ledger_entry_amount_positive",
            ),
            # NOTE: balance_after non-negative constraint is intentionally
            # absent here.  System clearing accounts (EXTERNAL_FUNDING,
            # EXTERNAL_SETTLEMENT) legitimately have negative balance_after
            # values.  The non-negative invariant for customer accounts is
            # enforced by account_balance_non_negative on the Account model,
            # which only applies when is_system_account=False.
        ]
