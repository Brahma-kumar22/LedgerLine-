"""
transactions/services/ledger_service.py

Double-entry ledger posting for MONVEX.

DOUBLE-ENTRY MODEL:
-------------------
Every completed financial event requires exactly two LedgerEntry rows:
    One DEBIT  (money leaving an account)
    One CREDIT (money entering an account)

The amounts must be equal.  The entries must reference the same Transaction.

EXTERNAL ACCOUNT CONVENTION:
-----------------------------
Deposits and withdrawals involve the real economy outside MONVEX.
To keep the books balanced we use two system accounts owned by ADMIN:

    EXTERNAL_FUNDING_ACCOUNT_ID   (env var or settings constant)
        The notional "source of all inbound money".
        Deposit:    DEBIT  external_funding,  CREDIT  customer_account
        Rationale:  Money flows from the external world into MONVEX.

    EXTERNAL_SETTLEMENT_ACCOUNT_ID
        The notional "sink for all outbound money".
        Withdrawal: DEBIT  customer_account,  CREDIT  external_settlement
        Rationale:  Money flows from MONVEX back to the external world.

These accounts are system-managed.  Their balances represent the total
external money flow and are not meaningful for individual customers.
The conservation invariant still holds: sum(all DEBITs) == sum(all CREDITs)
across the entire ledger at all times.

CALLER CONTRACT:
----------------
All functions in this module MUST be called inside an active
django.db.transaction.atomic() block.  They perform no locking themselves —
the caller (deposit/withdrawal/transfer service) holds the SELECT FOR UPDATE
lock on the affected Account rows before calling here.
"""

from decimal import Decimal

from django.conf import settings
from django.db.models import F

from accounts.models import Account
from ledger.models import LedgerEntry
from transactions.models import Transaction
from users.models import User


# ---------------------------------------------------------------------------
# System account helpers
# ---------------------------------------------------------------------------

def _get_system_account(account_id_setting: str) -> Account:
    """
    Retrieve a system clearing account.

    Looks up by the UUID stored in Django settings (primary key lookup —
    O(1), index-backed).  Falls back to account_tag lookup if the setting
    is not configured yet (e.g. during tests that call create_system_accounts
    directly).

    The account is fetched with SELECT FOR UPDATE so it participates in the
    same lock ordering as the customer account in the same atomic block.

    Raises RuntimeError if neither the setting nor a matching account_tag
    row can be found.
    """
    account_id = getattr(settings, account_id_setting, None)
    tag_map = {
        "EXTERNAL_FUNDING_ACCOUNT_ID":    "EXTERNAL_FUNDING",
        "EXTERNAL_SETTLEMENT_ACCOUNT_ID": "EXTERNAL_SETTLEMENT",
    }
    tag = tag_map.get(account_id_setting)

    if account_id:
        try:
            return Account.objects.select_for_update().get(pk=account_id)
        except Account.DoesNotExist:
            pass  # Fall through to tag lookup.

    if tag:
        try:
            return Account.objects.select_for_update().get(account_tag=tag)
        except Account.DoesNotExist:
            pass

    raise RuntimeError(
        f"System account for {account_id_setting!r} not found. "
        f"Run: python manage.py create_system_accounts"
    )


# ---------------------------------------------------------------------------
# Core posting primitive
# ---------------------------------------------------------------------------

def _post_entry(
    transaction: Transaction,
    account: Account,
    entry_type: str,
    amount: Decimal,
    initiated_by: User,
) -> LedgerEntry:
    """
    Write one LedgerEntry and update the account balance atomically.

    MUST be called inside an atomic() block with a SELECT FOR UPDATE lock
    already held on `account`.

    For a CREDIT: balance increases.
    For a DEBIT:  balance decreases.

    The LedgerEntry is created with the RESULTING balance (balance_after).
    The Account.balance is updated via F() expression to avoid a read-modify-
    write race (the F() executes as a single UPDATE ... SET balance = balance ± amount).
    """
    if entry_type == LedgerEntry.EntryType.CREDIT:
        new_balance = account.balance + amount
        Account.objects.filter(pk=account.pk).update(balance=F("balance") + amount)
    else:  # DEBIT
        new_balance = account.balance - amount
        Account.objects.filter(pk=account.pk).update(balance=F("balance") - amount)

    entry = LedgerEntry.objects.create(
        transaction=transaction,
        account=account,
        entry_type=entry_type,
        amount=amount,
        currency=transaction.currency,
        balance_after=new_balance,
        initiated_by=initiated_by,
    )
    return entry


# ---------------------------------------------------------------------------
# Public posting functions
# ---------------------------------------------------------------------------

def post_deposit(
    transaction: Transaction,
    destination_account: Account,
    amount: Decimal,
    initiated_by: User,
) -> tuple[LedgerEntry, LedgerEntry]:
    """
    Post double-entry entries for a deposit.

    DEBIT  → external_funding account   (notional inflow)
    CREDIT → destination_account        (customer balance increases)

    Returns (debit_entry, credit_entry).
    """
    external_funding = _get_system_account("EXTERNAL_FUNDING_ACCOUNT_ID")

    debit_entry  = _post_entry(transaction, external_funding,   LedgerEntry.EntryType.DEBIT,  amount, initiated_by)
    credit_entry = _post_entry(transaction, destination_account, LedgerEntry.EntryType.CREDIT, amount, initiated_by)

    _assert_balanced(transaction)
    return debit_entry, credit_entry


def post_withdrawal(
    transaction: Transaction,
    source_account: Account,
    amount: Decimal,
    initiated_by: User,
) -> tuple[LedgerEntry, LedgerEntry]:
    """
    Post double-entry entries for a withdrawal.

    DEBIT  → source_account             (customer balance decreases)
    CREDIT → external_settlement account (notional outflow)

    Returns (debit_entry, credit_entry).
    """
    external_settlement = _get_system_account("EXTERNAL_SETTLEMENT_ACCOUNT_ID")

    debit_entry  = _post_entry(transaction, source_account,          LedgerEntry.EntryType.DEBIT,  amount, initiated_by)
    credit_entry = _post_entry(transaction, external_settlement,      LedgerEntry.EntryType.CREDIT, amount, initiated_by)

    _assert_balanced(transaction)
    return debit_entry, credit_entry


def post_transfer(
    transaction: Transaction,
    source_account: Account,
    destination_account: Account,
    amount: Decimal,
    initiated_by: User,
) -> tuple[LedgerEntry, LedgerEntry]:
    """
    Post double-entry entries for an internal transfer.

    DEBIT  → source_account       (source balance decreases)
    CREDIT → destination_account  (destination balance increases)

    Both entries have identical amounts.
    Net effect on total system money: zero.

    Returns (debit_entry, credit_entry).
    """
    debit_entry  = _post_entry(transaction, source_account,      LedgerEntry.EntryType.DEBIT,  amount, initiated_by)
    credit_entry = _post_entry(transaction, destination_account, LedgerEntry.EntryType.CREDIT, amount, initiated_by)

    _assert_balanced(transaction)
    return debit_entry, credit_entry


# ---------------------------------------------------------------------------
# Integrity assertion
# ---------------------------------------------------------------------------

def _assert_balanced(transaction: Transaction) -> None:
    """
    Assert that the debit and credit totals are equal for this transaction.

    This is called immediately after posting entries, still inside the same
    atomic block, before the transaction is marked COMPLETED.

    If they differ, raise AssertionError which will cause the atomic block
    to roll back, preventing an unbalanced ledger from ever being committed.

    Note: CheckConstraints operate per-row and cannot catch cross-row
    imbalance.  This application-level assertion is the correct mechanism.
    """
    from django.db.models import Sum
    totals = (
        LedgerEntry.objects
        .filter(transaction=transaction)
        .values("entry_type")
        .annotate(total=Sum("amount"))
    )
    totals_map = {row["entry_type"]: row["total"] for row in totals}
    debit_total  = totals_map.get(LedgerEntry.EntryType.DEBIT,  Decimal("0"))
    credit_total = totals_map.get(LedgerEntry.EntryType.CREDIT, Decimal("0"))

    if debit_total != credit_total:
        raise AssertionError(
            f"Ledger imbalance for transaction {transaction.id}: "
            f"debits={debit_total} credits={credit_total}. "
            f"Rolling back."
        )
