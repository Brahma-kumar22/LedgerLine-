"""
accounts/models.py

Financial account models for MONVEX.

ACCOUNT OWNERSHIP AND AUTHORIZATION MODEL:
-------------------------------------------
An Account has an 'owner' foreign key.  The owner has implicit full access
to their own account — they do not need an AccountAccess record to view,
deposit, withdraw from, or transfer between their own accounts.

AccountAccess records grant EXPLICIT additional permissions to OTHER users
(not the owner).  For example:
    - A joint account holder who can deposit and withdraw.
    - A business employee who can only view the account balance.
    - A trusted party who can initiate transfers.

This two-tier model avoids contradictory rules:
    - Owner access is always implicit and always complete.
    - Third-party access is always explicit and always scoped.
    - Checking access: first check owner equality, then check AccountAccess.

BALANCE INTEGRITY:
------------------
balance must NEVER be modified directly.  The only authorised path is:
    1. Acquire SELECT FOR UPDATE lock on the Account row.
    2. Validate the operation (sufficient funds, active status, etc.).
    3. Write paired LedgerEntry rows (DEBIT + CREDIT) inside atomic().
    4. Update balance as a side-effect of that same atomic block.

No negative balances are permitted.  A CHECK constraint at the PostgreSQL
level enforces this independently of application code.
"""

import uuid

from django.conf import settings
from django.db import models


def _generate_account_number() -> str:
    """
    Generate a unique 16-digit account number.

    Format: MONV + 12 random digits, e.g. MONV123456789012.
    The UNIQUE constraint on the field is the definitive uniqueness guarantee;
    this function produces the candidate value.

    The Account model's save() method could retry on IntegrityError, but for
    the foundation we rely on database uniqueness enforcement — collisions with
    12 random digits are astronomically unlikely in practice.
    """
    import random
    digits = "".join(str(random.randint(0, 9)) for _ in range(12))
    return f"MONV{digits}"


class Account(models.Model):
    """
    A financial account owned by one MONVEX user.

    CONSERVATION INVARIANT:
        balance == sum of all CREDIT LedgerEntry amounts for this account
                 - sum of all DEBIT  LedgerEntry amounts for this account

    This invariant can be verified by a reconciliation job at any time.
    Any discrepancy indicates a bug in the transaction service.
    """

    class AccountType(models.TextChoices):
        CHECKING = "CHECKING", "Checking"
        SAVINGS  = "SAVINGS",  "Savings"
        WALLET   = "WALLET",   "Wallet"

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # Unique human-readable account identifier shown to the user.
    account_number = models.CharField(
        max_length=20,
        unique=True,
        default=_generate_account_number,
        editable=False,
        db_index=True,
        help_text="System-generated unique account number (e.g. MONV123456789012).",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,   # Never delete a user who still has accounts.
        related_name="accounts",
        db_index=True,
        help_text="The user who owns this account.",
    )

    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.CHECKING,
        db_index=True,
    )

    name = models.CharField(
        max_length=100,
        help_text='User-facing label, e.g. "My Savings".',
    )

    currency = models.CharField(
        max_length=3,
        default="USD",
        help_text="ISO 4217 currency code (e.g. USD, EUR, GBP).",
    )

    # Authoritative running balance.
    # Precision: 19 significant digits, 2 decimal places (cents).
    # NEVER use float for monetary values — rounding errors accumulate.
    # The CHECK constraint below prevents this going negative at the DB level.
    balance = models.DecimalField(
        max_digits=19,
        decimal_places=2,
        default=0,
        help_text=(
            "Running balance in the account's currency. "
            "Must equal the sum of all ledger entries for this account. "
            "Update ONLY inside an atomic transaction + LedgerEntry write."
        ),
    )

    # Deterministic identifier reserved for system/clearing accounts.
    # NULL for all customer accounts.  The UNIQUE constraint (below) ensures
    # only one account can ever hold a given tag regardless of concurrent
    # provisioning attempts — the database is the authority.
    #
    # Reserved tags:
    #   "EXTERNAL_FUNDING"    — notional source for all deposits
    #   "EXTERNAL_SETTLEMENT" — notional sink for all withdrawals
    account_tag = models.CharField(
        max_length=60,
        null=True,
        blank=True,
        unique=True,         # DB-level uniqueness — duplicates are impossible.
        db_index=True,
        default=None,
        help_text=(
            "Reserved for system accounts only. "
            "NULL for all customer accounts. "
            "Unique across the entire accounts table."
        ),
    )

    # System/clearing accounts are allowed to go negative because their
    # balance represents cumulative external money flow, not a spendable
    # balance.  Customer accounts must always be >= 0.
    is_system_account = models.BooleanField(
        default=False,
        db_index=True,
        help_text=(
            "True for EXTERNAL_FUNDING and EXTERNAL_SETTLEMENT clearing accounts. "
            "System accounts are exempt from the non-negative balance constraint."
        ),
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=(
            "Inactive accounts are closed. "
            "New transactions are rejected for inactive accounts."
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        return f"{self.account_number} — {self.name} ({self.owner.username})"

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "Account"
        verbose_name_plural = "Accounts"
        ordering = ["owner__username", "name"]
        indexes = [
            models.Index(fields=["owner", "is_active"],   name="account_owner_active_idx"),
            models.Index(fields=["currency"],              name="account_currency_idx"),
        ]
        constraints = [
            # Non-negative balance constraint.
            # Customer accounts (is_system_account=False) must always have
            # balance >= 0.  System clearing accounts (is_system_account=True)
            # are exempt because their negative balance is the accounting
            # representation of cumulative external money flow.
            #
            # Semantics:
            #   is_system_account=True  → constraint is vacuously satisfied
            #   is_system_account=False → balance must be >= 0
            models.CheckConstraint(
                condition=models.Q(is_system_account=True) | models.Q(balance__gte=0),
                name="account_balance_non_negative",
            ),
        ]


class AccountAccess(models.Model):
    """
    Explicit permission grant allowing a user (other than the owner) to
    perform specific operations on an account.

    PERMISSION SEMANTICS:
    ---------------------
    VIEW      — Read account balance and transaction history.
    DEPOSIT   — Credit funds into this account.
    WITHDRAW  — Debit funds from this account.
    TRANSFER  — Use this account as source or destination in a transfer.

    These permissions are additive; a user may hold more than one.
    The account owner never needs an AccountAccess record — owner access
    is always implicitly complete.

    AUTHORIZATION CHECK ALGORITHM (to be implemented in the service layer):
        1. If request.user == account.owner → allow all operations.
        2. Otherwise, look up AccountAccess(account=account, user=request.user).
        3. Check that the required permission is in the matching record.
        4. If no record or wrong permission → deny with 403.
    """

    class Permission(models.TextChoices):
        VIEW     = "VIEW",     "View"
        DEPOSIT  = "DEPOSIT",  "Deposit"
        WITHDRAW = "WITHDRAW", "Withdraw"
        TRANSFER = "TRANSFER", "Transfer"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,   # Access grants are deleted with the account.
        related_name="access_grants",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,   # Access grants are deleted with the user.
        related_name="account_access_grants",
        help_text="The user being granted access (must not be the account owner).",
    )

    permission = models.CharField(
        max_length=20,
        choices=Permission.choices,
        help_text="The specific operation this user is permitted to perform.",
    )

    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="access_grants_given",
        help_text="The administrator or owner who created this access grant.",
    )

    granted_at = models.DateTimeField(auto_now_add=True)

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        return (
            f"{self.user.username} → {self.permission} "
            f"on {self.account.account_number}"
        )

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "Account Access"
        verbose_name_plural = "Account Access Grants"
        # A user can have at most one grant of each permission per account.
        unique_together = [("account", "user", "permission")]
        indexes = [
            models.Index(fields=["account", "user"], name="access_account_user_idx"),
            models.Index(fields=["user"],             name="access_user_idx"),
        ]
        constraints = [
            # Prevent the account owner from being added as an explicit
            # access grantee — their access is always implicit.
            # This is enforced in the serializer/service layer; this
            # model-level note documents the intent. A DB-level constraint
            # would require a trigger (owner is in a different table).
        ]
