"""
tests/test_idempotency.py

Idempotency tests for MONVEX.

Covers:
  - Same key + same payload returns original result (no duplicate transaction).
  - Same key + different payload is rejected with 422.
  - Retry of a failed request returns the stored failure; no duplicate posting.
  - Idempotency record survives financial rollback.
  - Concurrent duplicate requests create only one transaction (genuine PostgreSQL concurrency).
"""

import threading
import uuid
from decimal import Decimal

import pytest

from transactions.idempotency import IdempotencyRecord
from transactions.models import Transaction
from transactions.services import (
    InsufficientFundsError,
    deposit,
    withdraw,
)
from transactions.services.exceptions import (
    IdempotencyConflictError,
    IdempotencyMismatchError,
)
from transactions.services.idempotency_service import (
    check_or_create,
    compute_request_hash,
    mark_failed,
)


def fresh_key():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Same key / same payload → replay
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=False)
class TestIdempotencyReplay:

    def test_same_key_same_payload_returns_original_transaction(
        self, user, make_account, system_accounts
    ):
        account = make_account(user, balance=Decimal("0"))
        key = fresh_key()

        txn1 = deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("100.00"), idempotency_key=key,
        )
        txn2 = deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("100.00"), idempotency_key=key,
        )

        assert txn1.pk == txn2.pk, "Duplicate request must return the same Transaction"
        # Balance must be 100, not 200 — no double-posting.
        account.refresh_from_db()
        assert account.balance == Decimal("100.00")

    def test_same_key_only_one_idempotency_record(self, user, make_account, system_accounts):
        account = make_account(user)
        key = fresh_key()
        deposit(user=user, account_id=str(account.pk), amount=Decimal("50.00"), idempotency_key=key)
        deposit(user=user, account_id=str(account.pk), amount=Decimal("50.00"), idempotency_key=key)
        count = IdempotencyRecord.objects.filter(
            user=user, idempotency_key=uuid.UUID(key)
        ).count()
        assert count == 1, f"Expected 1 IdempotencyRecord, got {count}"

    def test_same_key_only_one_transaction(self, user, make_account, system_accounts):
        account = make_account(user)
        key = fresh_key()
        deposit(user=user, account_id=str(account.pk), amount=Decimal("50.00"), idempotency_key=key)
        deposit(user=user, account_id=str(account.pk), amount=Decimal("50.00"), idempotency_key=key)
        count = Transaction.objects.filter(destination_account=account).count()
        assert count == 1, f"Expected 1 Transaction, got {count}"


# ---------------------------------------------------------------------------
# Same key / different payload → rejection
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=False)
class TestIdempotencyMismatch:

    def test_different_payload_same_key_raises_mismatch(self, user, make_account, system_accounts):
        account = make_account(user)
        key = fresh_key()
        deposit(user=user, account_id=str(account.pk), amount=Decimal("50.00"), idempotency_key=key)

        with pytest.raises(IdempotencyMismatchError):
            deposit(
                user=user, account_id=str(account.pk),
                amount=Decimal("999.00"),  # Different amount → different hash.
                idempotency_key=key,
            )

    def test_mismatch_does_not_create_second_transaction(self, user, make_account, system_accounts):
        account = make_account(user)
        key = fresh_key()
        deposit(user=user, account_id=str(account.pk), amount=Decimal("50.00"), idempotency_key=key)
        try:
            deposit(user=user, account_id=str(account.pk), amount=Decimal("1.00"), idempotency_key=key)
        except IdempotencyMismatchError:
            pass
        assert Transaction.objects.filter(destination_account=account).count() == 1

    def test_invalid_uuid_key_raises_mismatch(self, user, make_account, system_accounts):
        account = make_account(user)
        with pytest.raises(IdempotencyMismatchError):
            deposit(
                user=user, account_id=str(account.pk),
                amount=Decimal("10.00"), idempotency_key="not-a-uuid",
            )


# ---------------------------------------------------------------------------
# Failed request semantics
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=False)
class TestIdempotencyFailureSemantics:

    def test_failed_idempotency_record_survives_financial_rollback(
        self, user, make_account, system_accounts
    ):
        """
        When a withdrawal fails (insufficient funds), the financial transaction
        is rolled back.  The IdempotencyRecord must survive with status=FAILED.

        This verifies the critical design: idempotency records are written
        OUTSIDE the atomic financial block.
        """
        account = make_account(user, balance=Decimal("5.00"))
        key = fresh_key()

        with pytest.raises(InsufficientFundsError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=key,
            )

        record = IdempotencyRecord.objects.get(user=user, idempotency_key=uuid.UUID(key))
        assert record.status == IdempotencyRecord.Status.FAILED, \
            f"IdempotencyRecord status should be FAILED, got {record.status}"
        assert record.transaction is None, \
            "FAILED record should have no linked Transaction"

    def test_failed_record_cannot_be_used_to_duplicate_money_movement(
        self, user, make_account, system_accounts
    ):
        """
        A retry with a FAILED idempotency record must return the failure,
        not process a new transaction.
        """
        account = make_account(user, balance=Decimal("5.00"))
        key = fresh_key()

        # First attempt fails.
        with pytest.raises(InsufficientFundsError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=key,
            )

        # Second attempt with same key re-raises the stored failure.
        from transactions.services.exceptions import FinancialError
        with pytest.raises(FinancialError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("100.00"), idempotency_key=key,
            )

        # No transaction was ever completed.
        assert Transaction.objects.filter(
            source_account=account,
            status=Transaction.Status.COMPLETED
        ).count() == 0
        account.refresh_from_db()
        assert account.balance == Decimal("5.00")

    def test_idempotency_record_created_before_financial_block(
        self, user, make_account, system_accounts
    ):
        """
        The IdempotencyRecord is written in a savepoint BEFORE the financial
        atomic block.  This means it exists in the DB even if the financial
        block rolls back.  Verify by checking the record exists after a failure.
        """
        account = make_account(user, balance=Decimal("0"))
        key = fresh_key()
        with pytest.raises(InsufficientFundsError):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("999.00"), idempotency_key=key,
            )
        # The record must exist with FAILED status.
        assert IdempotencyRecord.objects.filter(
            user=user, idempotency_key=uuid.UUID(key)
        ).exists()


# ---------------------------------------------------------------------------
# Concurrent duplicate requests — genuine separate DB connections
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
class TestIdempotencyConcurrency:
    """
    Uses transaction=True so each test uses a real committed transaction
    visible to other connections.  Threads use their own Django DB connections.

    These tests genuinely exercise PostgreSQL-level concurrency.
    """

    def test_concurrent_duplicate_deposit_creates_one_transaction(
        self, user, make_account, system_accounts
    ):
        """
        Two threads submit the same deposit request simultaneously.
        Only one Transaction must be created.

        Mechanism: the second thread's INSERT on IdempotencyRecord fails
        with a unique constraint violation (user, idempotency_key).  The
        second thread returns the existing record.
        """
        account = make_account(user, balance=Decimal("0"))
        key = fresh_key()

        results = []
        errors  = []

        def do_deposit():
            try:
                # Close the inherited connection so each thread gets its own.
                from django.db import connection as conn
                conn.close()
                txn = deposit(
                    user=user, account_id=str(account.pk),
                    amount=Decimal("100.00"), idempotency_key=key,
                )
                results.append(txn.pk)
            except Exception as e:
                errors.append(e)
            finally:
                from django.db import connection as conn
                conn.close()

        t1 = threading.Thread(target=do_deposit)
        t2 = threading.Thread(target=do_deposit)
        t1.start(); t2.start()
        t1.join(timeout=30); t2.join(timeout=30)

        # No unexpected errors.
        from transactions.services.exceptions import IdempotencyConflictError
        real_errors = [e for e in errors if not isinstance(e, IdempotencyConflictError)]
        assert not real_errors, f"Unexpected errors: {real_errors}"

        # Exactly one transaction created.
        txn_count = Transaction.objects.filter(
            destination_account=account,
            status=Transaction.Status.COMPLETED,
        ).count()
        assert txn_count == 1, f"Expected 1 transaction, got {txn_count}"

        # Balance is exactly 100, not 200.
        account.refresh_from_db()
        assert account.balance == Decimal("100.00"), \
            f"Expected 100.00, got {account.balance}"

        # Exactly one IdempotencyRecord.
        idem_count = IdempotencyRecord.objects.filter(
            user=user, idempotency_key=uuid.UUID(key)
        ).count()
        assert idem_count == 1, f"Expected 1 IdempotencyRecord, got {idem_count}"
