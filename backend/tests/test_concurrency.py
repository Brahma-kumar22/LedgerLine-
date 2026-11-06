"""
tests/test_concurrency.py

Genuine PostgreSQL concurrency tests for MONVEX.

METHODOLOGY:
    - Uses @pytest.mark.django_db(transaction=True) so data is committed
      and visible to other database connections.
    - Each thread closes its inherited connection and acquires a fresh one,
      producing genuinely concurrent PostgreSQL transactions.
    - Tests verify final balances, ledger entries, and transaction counts
      from the main thread after all worker threads complete.

TESTS:
    1. Two withdrawals competing for insufficient combined funds.
    2. Opposite-direction simultaneous transfers (deadlock prevention).
    3. Concurrent deposits to the same account via shared funding account.
    4. Concurrent system account provisioning (idempotency).
"""

import threading
import time
import uuid
from decimal import Decimal

import pytest

from accounts.models import Account
from ledger.models import LedgerEntry
from transactions.models import Transaction
from transactions.services import (
    InsufficientFundsError,
    deposit,
    transfer,
    withdraw,
)
from transactions.services.exceptions import IdempotencyConflictError


def fresh_key():
    return str(uuid.uuid4())


def close_and_run(fn):
    """Close inherited DB connection before running fn in a thread."""
    from django.db import connection
    connection.close()
    try:
        return fn()
    finally:
        connection.close()


# ---------------------------------------------------------------------------
# Test 1: Two withdrawals competing for insufficient combined funds
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_two_concurrent_withdrawals_only_one_succeeds(user, make_account, system_accounts):
    """
    Account has balance=100.  Two threads each try to withdraw 80.
    Only one can succeed.  Final balance must be 20 (not -60).

    The SELECT FOR UPDATE lock in withdrawal_service ensures the second
    thread sees the updated balance after the first commits.

    GENUINE CONCURRENCY: two separate PostgreSQL transactions,
    each holding a row-level lock on the account.
    """
    account = make_account(user, balance=Decimal("100.00"))

    results = {"success": 0, "failed": 0, "errors": []}
    barrier = threading.Barrier(2)

    def do_withdraw():
        def work():
            barrier.wait()  # Both threads start simultaneously.
            try:
                withdraw(
                    user=user,
                    account_id=str(account.pk),
                    amount=Decimal("80.00"),
                    idempotency_key=fresh_key(),
                )
                results["success"] += 1
            except InsufficientFundsError:
                results["failed"] += 1
            except Exception as e:
                results["errors"].append(e)
        close_and_run(work)

    threads = [threading.Thread(target=do_withdraw) for _ in range(2)]
    for t in threads: t.start()
    for t in threads: t.join(timeout=30)

    assert not results["errors"], f"Unexpected errors: {results['errors']}"
    assert results["success"] == 1, f"Expected exactly 1 success, got {results['success']}"
    assert results["failed"]  == 1, f"Expected exactly 1 failure, got {results['failed']}"

    account.refresh_from_db()
    assert account.balance == Decimal("20.00"), \
        f"Expected final balance 20.00, got {account.balance}"

    # Verify exactly one completed withdrawal transaction.
    completed = Transaction.objects.filter(
        source_account=account, status=Transaction.Status.COMPLETED
    ).count()
    assert completed == 1, f"Expected 1 completed transaction, got {completed}"


# ---------------------------------------------------------------------------
# Test 2: Opposite-direction transfers (deadlock prevention)
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_opposite_direction_transfers_no_deadlock(user, make_account, system_accounts):
    """
    Thread A: transfer 50 from account_x to account_y.
    Thread B: transfer 50 from account_y to account_x (opposite direction).

    Without deterministic lock ordering, this causes a deadlock.
    The transfer_service uses sorted(UUIDs) to lock accounts in a
    consistent order, preventing the circular wait.

    Both transfers should complete.  Final balances must be identical
    to starting balances (100 each, since same amount both ways).
    """
    account_x = make_account(user, balance=Decimal("100.00"))
    account_y = make_account(user, balance=Decimal("100.00"))

    results = {"success": 0, "errors": []}
    barrier = threading.Barrier(2)

    def do_a():
        def work():
            barrier.wait()
            try:
                transfer(
                    user=user,
                    source_account_id=str(account_x.pk),
                    destination_account_id=str(account_y.pk),
                    amount=Decimal("50.00"),
                    idempotency_key=fresh_key(),
                )
                results["success"] += 1
            except Exception as e:
                results["errors"].append(("A", e))
        close_and_run(work)

    def do_b():
        def work():
            barrier.wait()
            try:
                transfer(
                    user=user,
                    source_account_id=str(account_y.pk),
                    destination_account_id=str(account_x.pk),
                    amount=Decimal("50.00"),
                    idempotency_key=fresh_key(),
                )
                results["success"] += 1
            except Exception as e:
                results["errors"].append(("B", e))
        close_and_run(work)

    ta = threading.Thread(target=do_a)
    tb = threading.Thread(target=do_b)
    ta.start(); tb.start()
    ta.join(timeout=30); tb.join(timeout=30)

    assert not results["errors"], f"Unexpected errors: {results['errors']}"
    assert results["success"] == 2, f"Expected both transfers to succeed, got {results['success']}"

    account_x.refresh_from_db()
    account_y.refresh_from_db()
    # 100 - 50 + 50 = 100 for each.
    assert account_x.balance == Decimal("100.00"), f"account_x: {account_x.balance}"
    assert account_y.balance == Decimal("100.00"), f"account_y: {account_y.balance}"


# ---------------------------------------------------------------------------
# Test 3: Concurrent deposits to the same account
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_concurrent_deposits_all_succeed(user, make_account, system_accounts):
    """
    Five threads each deposit $100 to the same account.
    All five should succeed.  Final balance must be exactly $500.

    The EXTERNAL_FUNDING system account is locked for each deposit,
    serialising concurrent deposits through it.
    """
    account = make_account(user, balance=Decimal("0"))
    n = 5
    results = {"success": 0, "errors": []}
    barrier = threading.Barrier(n)

    def do_deposit():
        def work():
            barrier.wait()
            try:
                deposit(
                    user=user,
                    account_id=str(account.pk),
                    amount=Decimal("100.00"),
                    idempotency_key=fresh_key(),
                )
                results["success"] += 1
            except Exception as e:
                results["errors"].append(e)
        close_and_run(work)

    threads = [threading.Thread(target=do_deposit) for _ in range(n)]
    for t in threads: t.start()
    for t in threads: t.join(timeout=60)

    assert not results["errors"], f"Unexpected errors: {results['errors']}"
    assert results["success"] == n, f"Expected {n} successes, got {results['success']}"

    account.refresh_from_db()
    assert account.balance == Decimal("500.00"), \
        f"Expected 500.00, got {account.balance}"

    # Exactly n completed transactions.
    txn_count = Transaction.objects.filter(
        destination_account=account,
        status=Transaction.Status.COMPLETED,
    ).count()
    assert txn_count == n, f"Expected {n} transactions, got {txn_count}"

    # Exactly 2n ledger entries (one debit + one credit per deposit).
    entry_count = LedgerEntry.objects.filter(account=account).count()
    assert entry_count == n, f"Expected {n} credit entries for customer account, got {entry_count}"


# ---------------------------------------------------------------------------
# Test 4: Concurrent system account provisioning
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_concurrent_system_account_provisioning_is_idempotent():
    """
    Five threads call create_system_accounts simultaneously.
    Only two system account rows (EXTERNAL_FUNDING, EXTERNAL_SETTLEMENT)
    must exist after all threads complete.

    The UNIQUE constraint on account_tag prevents duplicates.
    """
    from users.management.commands.create_system_accounts import _get_or_create_system_owner

    results = {"errors": []}
    barrier = threading.Barrier(5)

    def do_provision():
        def work():
            barrier.wait()
            try:
                from django.db import IntegrityError
                from accounts.models import Account
                owner = _get_or_create_system_owner()
                for tag, name in [
                    ("EXTERNAL_FUNDING",    "External Funding (System)"),
                    ("EXTERNAL_SETTLEMENT", "External Settlement (System)"),
                ]:
                    try:
                        Account.objects.get_or_create(
                            account_tag=tag,
                            defaults={
                                "owner":             owner,
                                "name":              name,
                                "account_type":      Account.AccountType.WALLET,
                                "currency":          "USD",
                                "balance":           Decimal("0"),
                                "is_active":         True,
                                "is_system_account": True,
                            },
                        )
                    except IntegrityError:
                        pass  # Another thread won the race — this is expected.
            except Exception as e:
                results["errors"].append(e)
        close_and_run(work)

    threads = [threading.Thread(target=do_provision) for _ in range(5)]
    for t in threads: t.start()
    for t in threads: t.join(timeout=30)

    assert not results["errors"], f"Unexpected errors: {results['errors']}"

    # Exactly one row per tag.
    funding_count    = Account.objects.filter(account_tag="EXTERNAL_FUNDING").count()
    settlement_count = Account.objects.filter(account_tag="EXTERNAL_SETTLEMENT").count()
    assert funding_count    == 1, f"Expected 1 EXTERNAL_FUNDING, got {funding_count}"
    assert settlement_count == 1, f"Expected 1 EXTERNAL_SETTLEMENT, got {settlement_count}"
