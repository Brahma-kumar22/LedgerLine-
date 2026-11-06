"""
tests/test_financial_integrity.py

Financial integrity tests for MONVEX.

Covers:
  - Basic deposit, withdrawal, transfer success paths.
  - Double-entry ledger correctness (debit == credit per transaction).
  - Conservation invariant across customer + system accounts.
  - No negative customer balances.
  - Failed operations leave no partial postings.
  - Completed transactions have correct ledger entries.
  - Authorization enforcement.
  - Auditor cannot perform financial operations.

All tests run against the real PostgreSQL database.
No SQLite is used.
"""

import uuid
from decimal import Decimal

import pytest
from django.db.models import Sum

from accounts.models import Account
from audit.models import AuditLog
from ledger.models import LedgerEntry
from transactions.models import Transaction
from transactions.attempts import TransactionAttempt
from transactions.services import (
    AuthorizationError,
    InsufficientFundsError,
    SameAccountTransferError,
    deposit,
    transfer,
    withdraw,
)
from transactions.services.exceptions import AccountNotFoundError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fresh_key():
    return str(uuid.uuid4())


def get_balance(account):
    account.refresh_from_db()
    return account.balance


def ledger_totals(transaction):
    entries = LedgerEntry.objects.filter(transaction=transaction)
    debit  = entries.filter(entry_type="DEBIT").aggregate(t=Sum("amount"))["t"] or Decimal("0")
    credit = entries.filter(entry_type="CREDIT").aggregate(t=Sum("amount"))["t"] or Decimal("0")
    return debit, credit


# ---------------------------------------------------------------------------
# Basic deposit
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=False)
class TestDeposit:

    def test_deposit_success(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("0"))
        txn = deposit(
            user=user,
            account_id=str(account.pk),
            amount=Decimal("100.00"),
            currency="USD",
            idempotency_key=fresh_key(),
        )
        assert txn.status == Transaction.Status.COMPLETED
        assert get_balance(account) == Decimal("100.00")

    def test_deposit_creates_two_ledger_entries(self, user, make_account, system_accounts):
        account = make_account(user)
        txn = deposit(
            user=user,
            account_id=str(account.pk),
            amount=Decimal("50.00"),
            idempotency_key=fresh_key(),
        )
        entries = LedgerEntry.objects.filter(transaction=txn)
        assert entries.count() == 2
        assert entries.filter(entry_type="DEBIT").count()  == 1
        assert entries.filter(entry_type="CREDIT").count() == 1

    def test_deposit_ledger_is_balanced(self, user, make_account, system_accounts):
        account = make_account(user)
        txn = deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("75.50"), idempotency_key=fresh_key(),
        )
        debit, credit = ledger_totals(txn)
        assert debit == credit, f"Ledger imbalance: debit={debit} credit={credit}"

    def test_deposit_debit_goes_to_external_funding(self, user, make_account, system_accounts):
        account = make_account(user)
        funding_id = system_accounts["funding"].pk
        txn = deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("200.00"), idempotency_key=fresh_key(),
        )
        debit_entry = LedgerEntry.objects.get(transaction=txn, entry_type="DEBIT")
        assert debit_entry.account_id == funding_id

    def test_external_funding_balance_goes_negative(self, user, make_account, system_accounts):
        """
        After a deposit, EXTERNAL_FUNDING balance should be negative.
        This is intentional: the system account represents cumulative outflow.
        The non-negative constraint is exempt for is_system_account=True accounts.
        """
        account = make_account(user)
        deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("300.00"), idempotency_key=fresh_key(),
        )
        system_accounts["funding"].refresh_from_db()
        assert system_accounts["funding"].balance == Decimal("-300.00"), (
            "External funding account should have negative balance after deposit."
        )

    def test_deposit_writes_audit_log(self, user, make_account, system_accounts):
        account = make_account(user)
        txn = deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("50.00"), idempotency_key=fresh_key(),
        )
        assert AuditLog.objects.filter(
            event_type=AuditLog.EventType.TRANSACTION_COMPLETED,
            resource_id=str(txn.pk),
        ).exists()

    def test_deposit_unauthorized_user_rejected(self, user, user2, make_account, system_accounts):
        """
        user2 has no access to user's account.
        The service returns AccountNotFoundError (not AuthorizationError) to
        avoid revealing the account's existence to unauthorized callers.
        """
        account = make_account(user)
        with pytest.raises((AuthorizationError, AccountNotFoundError)):
            deposit(
                user=user2, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=fresh_key(),
            )

    def test_auditor_cannot_deposit(self, user, auditor_user, make_account, system_accounts):
        """
        Auditors cannot move money. Because auditor_user is not the owner and
        has no AccountAccess grant, the service returns AccountNotFoundError.
        This is the correct security behaviour: existence not revealed.
        """
        account = make_account(user)
        with pytest.raises((AuthorizationError, AccountNotFoundError)):
            deposit(
                user=auditor_user, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=fresh_key(),
            )

    def test_deposit_refused_attempt_recorded(self, user, user2, make_account, system_accounts):
        account = make_account(user)
        with pytest.raises((AuthorizationError, AccountNotFoundError)):
            deposit(
                user=user2, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=fresh_key(),
            )
        # A refused attempt must be recorded regardless of which error was raised.
        assert TransactionAttempt.objects.filter(
            initiated_by=user2,
            transaction_type="DEPOSIT",
            outcome=TransactionAttempt.Outcome.REFUSED,
        ).exists()


# ---------------------------------------------------------------------------
# Basic withdrawal
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=False)
class TestWithdrawal:

    def test_withdrawal_success(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("200.00"))
        txn = withdraw(
            user=user, account_id=str(account.pk),
            amount=Decimal("80.00"), idempotency_key=fresh_key(),
        )
        assert txn.status == Transaction.Status.COMPLETED
        assert get_balance(account) == Decimal("120.00")

    def test_withdrawal_balanced_ledger(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("500.00"))
        txn = withdraw(
            user=user, account_id=str(account.pk),
            amount=Decimal("150.00"), idempotency_key=fresh_key(),
        )
        debit, credit = ledger_totals(txn)
        assert debit == credit

    def test_withdrawal_credit_goes_to_external_settlement(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("100.00"))
        settlement_id = system_accounts["settlement"].pk
        txn = withdraw(
            user=user, account_id=str(account.pk),
            amount=Decimal("60.00"), idempotency_key=fresh_key(),
        )
        credit_entry = LedgerEntry.objects.get(transaction=txn, entry_type="CREDIT")
        assert credit_entry.account_id == settlement_id

    def test_insufficient_funds_rejected(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("50.00"))
        with pytest.raises(InsufficientFundsError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=fresh_key(),
            )

    def test_insufficient_funds_leaves_no_ledger_entries(self, user, make_account, system_accounts):
        """Failed withdrawal must not leave any partial ledger postings."""
        account = make_account(user, balance=Decimal("10.00"))
        initial_entry_count = LedgerEntry.objects.filter(account=account).count()
        with pytest.raises(InsufficientFundsError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=fresh_key(),
            )
        account.refresh_from_db()
        assert account.balance == Decimal("10.00"), "Balance must be unchanged after failed withdrawal"
        assert LedgerEntry.objects.filter(account=account).count() == initial_entry_count, \
            "No ledger entries must be created for a failed withdrawal"

    def test_withdrawal_refused_attempt_recorded_on_insufficient_funds(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("5.00"))
        with pytest.raises(InsufficientFundsError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("1000.00"), idempotency_key=fresh_key(),
            )
        assert TransactionAttempt.objects.filter(
            initiated_by=user,
            outcome=TransactionAttempt.Outcome.REFUSED,
            transaction_type="WITHDRAWAL",
        ).exists()

    def test_withdrawal_cannot_produce_negative_balance(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("100.00"))
        with pytest.raises(InsufficientFundsError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("100.01"), idempotency_key=fresh_key(),
            )
        account.refresh_from_db()
        assert account.balance >= Decimal("0"), "Customer account balance must never be negative"


# ---------------------------------------------------------------------------
# Basic transfer
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=False)
class TestTransfer:

    def test_transfer_success(self, user, make_account, system_accounts):
        src = make_account(user, balance=Decimal("300.00"))
        dst = make_account(user, balance=Decimal("0.00"))
        txn = transfer(
            user=user,
            source_account_id=str(src.pk),
            destination_account_id=str(dst.pk),
            amount=Decimal("100.00"),
            idempotency_key=fresh_key(),
        )
        assert txn.status == Transaction.Status.COMPLETED
        assert get_balance(src) == Decimal("200.00")
        assert get_balance(dst) == Decimal("100.00")

    def test_transfer_exactly_one_debit_one_credit(self, user, make_account, system_accounts):
        src = make_account(user, balance=Decimal("200.00"))
        dst = make_account(user, balance=Decimal("0.00"))
        txn = transfer(
            user=user,
            source_account_id=str(src.pk),
            destination_account_id=str(dst.pk),
            amount=Decimal("50.00"),
            idempotency_key=fresh_key(),
        )
        entries = LedgerEntry.objects.filter(transaction=txn)
        assert entries.count() == 2
        assert entries.filter(entry_type="DEBIT").count()  == 1
        assert entries.filter(entry_type="CREDIT").count() == 1

    def test_transfer_debit_equals_credit(self, user, make_account, system_accounts):
        src = make_account(user, balance=Decimal("500.00"))
        dst = make_account(user, balance=Decimal("0.00"))
        txn = transfer(
            user=user,
            source_account_id=str(src.pk),
            destination_account_id=str(dst.pk),
            amount=Decimal("123.45"),
            idempotency_key=fresh_key(),
        )
        debit, credit = ledger_totals(txn)
        assert debit == credit

    def test_transfer_conservation_invariant(self, user, make_account, system_accounts):
        """Total money across source + destination must be conserved."""
        src = make_account(user, balance=Decimal("400.00"))
        dst = make_account(user, balance=Decimal("100.00"))
        total_before = get_balance(src) + get_balance(dst)
        transfer(
            user=user,
            source_account_id=str(src.pk),
            destination_account_id=str(dst.pk),
            amount=Decimal("150.00"),
            idempotency_key=fresh_key(),
        )
        total_after = get_balance(src) + get_balance(dst)
        assert total_before == total_after, \
            f"Conservation violation: before={total_before} after={total_after}"

    def test_transfer_same_account_rejected(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("100.00"))
        with pytest.raises(SameAccountTransferError):
            transfer(
                user=user,
                source_account_id=str(account.pk),
                destination_account_id=str(account.pk),
                amount=Decimal("50.00"),
                idempotency_key=fresh_key(),
            )

    def test_transfer_insufficient_funds(self, user, make_account, system_accounts):
        src = make_account(user, balance=Decimal("10.00"))
        dst = make_account(user, balance=Decimal("0.00"))
        with pytest.raises(InsufficientFundsError):
            transfer(
                user=user,
                source_account_id=str(src.pk),
                destination_account_id=str(dst.pk),
                amount=Decimal("100.00"),
                idempotency_key=fresh_key(),
            )

    def test_transfer_failed_leaves_no_partial_postings(self, user, make_account, system_accounts):
        """A failed transfer must leave both balances unchanged with no ledger entries."""
        src = make_account(user, balance=Decimal("20.00"))
        dst = make_account(user, balance=Decimal("0.00"))
        src_before = get_balance(src)
        dst_before = get_balance(dst)
        with pytest.raises(InsufficientFundsError):
            transfer(
                user=user,
                source_account_id=str(src.pk),
                destination_account_id=str(dst.pk),
                amount=Decimal("999.00"),
                idempotency_key=fresh_key(),
            )
        assert get_balance(src) == src_before
        assert get_balance(dst) == dst_before
        # No transaction row should exist in COMPLETED state for this failed attempt.
        completed = Transaction.objects.filter(
            source_account=src,
            status=Transaction.Status.COMPLETED,
        )
        assert completed.count() == 0

    def test_unauthorized_transfer_rejected(self, user, user2, make_account, system_accounts):
        src = make_account(user,  balance=Decimal("200.00"))
        dst = make_account(user,  balance=Decimal("0.00"))
        with pytest.raises((AuthorizationError, AccountNotFoundError)):
            transfer(
                user=user2,
                source_account_id=str(src.pk),
                destination_account_id=str(dst.pk),
                amount=Decimal("100.00"),
                idempotency_key=fresh_key(),
            )


# ---------------------------------------------------------------------------
# Conservation: deposits + withdrawals across system accounts
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=False)
class TestConservation:

    def test_deposit_then_withdrawal_net_zero_system_accounts(self, user, make_account, system_accounts):
        """
        Deposit $100 then withdraw $100.
        Customer account: back to 0.
        EXTERNAL_FUNDING:    -100 (debited for the deposit).
        EXTERNAL_SETTLEMENT: +100 (credited for the withdrawal).
        Total across all three: 0. Conservation holds.
        """
        account = make_account(user, balance=Decimal("0"))

        deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("100.00"), idempotency_key=fresh_key(),
        )
        withdraw(
            user=user, account_id=str(account.pk),
            amount=Decimal("100.00"), idempotency_key=fresh_key(),
        )

        system_accounts["funding"].refresh_from_db()
        system_accounts["settlement"].refresh_from_db()
        account.refresh_from_db()

        assert account.balance == Decimal("0.00")
        assert system_accounts["funding"].balance    == Decimal("-100.00")
        assert system_accounts["settlement"].balance == Decimal("100.00")

        # Total across all three accounts: 0 + (-100) + 100 = 0.
        total = (
            account.balance
            + system_accounts["funding"].balance
            + system_accounts["settlement"].balance
        )
        assert total == Decimal("0.00"), f"Conservation violation: total={total}"

    def test_ledger_global_balance_equals_zero(self, user, make_account, system_accounts):
        """
        The sum of all CREDIT entries minus the sum of all DEBIT entries
        across the entire ledger must equal zero (double-entry invariant).
        """
        account = make_account(user, balance=Decimal("0"))
        deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("250.00"), idempotency_key=fresh_key(),
        )

        total_debits  = LedgerEntry.objects.aggregate(t=Sum("amount", filter=__import__("django.db.models", fromlist=["Q"]).Q(entry_type="DEBIT")))["t"]  or Decimal("0")
        total_credits = LedgerEntry.objects.aggregate(t=Sum("amount", filter=__import__("django.db.models", fromlist=["Q"]).Q(entry_type="CREDIT")))["t"] or Decimal("0")
        assert total_debits == total_credits, \
            f"Global ledger imbalance: debits={total_debits} credits={total_credits}"
