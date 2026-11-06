"""
tests/test_immutability.py

Immutability tests for MONVEX.

Verifies that PostgreSQL triggers (not just Django admin restrictions)
reject UPDATE and DELETE on:
  - ledger_ledgerentry
  - audit_auditlog
  - transactions_transaction  (completed/reversed rows)
  - transactions_transactionattempt

Also verifies Django ORM-layer signal enforcement.

IMPORTANT: Raw SQL tests use connection.cursor() to bypass the ORM,
proving that the PostgreSQL triggers (not Django signals) are the
actual enforcement mechanism for those paths.
"""

import uuid
from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied
from django.db import ProgrammingError, connection, transaction

from accounts.models import Account
from audit.models import AuditLog
from ledger.models import LedgerEntry
from transactions.attempts import TransactionAttempt
from transactions.models import Transaction
from transactions.services import deposit, withdraw


def fresh_key():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# LedgerEntry immutability
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
class TestLedgerImmutability:

    def _make_entry(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("0"))
        txn = deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("100.00"), idempotency_key=fresh_key(),
        )
        return LedgerEntry.objects.filter(transaction=txn).first()

    def test_orm_update_raises_permission_denied(self, user, make_account, system_accounts):
        """Django pre_save signal blocks ORM .save() on existing LedgerEntry."""
        entry = self._make_entry(user, make_account, system_accounts)
        with pytest.raises(PermissionDenied):
            entry.amount = Decimal("999.00")
            entry.save()

    def test_raw_sql_update_rejected_by_trigger(self, user, make_account, system_accounts):
        """PostgreSQL trigger blocks raw SQL UPDATE on ledger_ledgerentry."""
        entry = self._make_entry(user, make_account, system_accounts)
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "UPDATE ledger_ledgerentry SET amount = %s WHERE id = %s",
                        [Decimal("999.00"), str(entry.pk)],
                    )
        # The exception message must come from our trigger, not a generic DB error.
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg, \
            f"Expected MONVEX trigger message, got: {exc_info.value}"

    def test_raw_sql_delete_rejected_by_trigger(self, user, make_account, system_accounts):
        """PostgreSQL trigger blocks raw SQL DELETE on ledger_ledgerentry."""
        entry = self._make_entry(user, make_account, system_accounts)
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "DELETE FROM ledger_ledgerentry WHERE id = %s",
                        [str(entry.pk)],
                    )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg


# ---------------------------------------------------------------------------
# AuditLog immutability
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
class TestAuditLogImmutability:

    def _make_log(self, user):
        return AuditLog.objects.create(
            actor=user,
            event_type=AuditLog.EventType.ADMIN_ACTION,
            resource_type="Test",
            resource_id="test-id",
            metadata={"test": True},
        )

    def test_orm_update_raises_permission_denied(self, user):
        log = self._make_log(user)
        with pytest.raises(PermissionDenied):
            log.resource_id = "tampered"
            log.save()

    def test_raw_sql_update_rejected_by_trigger(self, user):
        log = self._make_log(user)
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "UPDATE audit_auditlog SET resource_id = %s WHERE id = %s",
                        ["tampered", str(log.pk)],
                    )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg

    def test_raw_sql_delete_rejected_by_trigger(self, user):
        log = self._make_log(user)
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "DELETE FROM audit_auditlog WHERE id = %s",
                        [str(log.pk)],
                    )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg


# ---------------------------------------------------------------------------
# Completed Transaction immutability
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
class TestTransactionImmutability:

    def _make_completed_txn(self, user, make_account, system_accounts):
        account = make_account(user, balance=Decimal("0"))
        return deposit(
            user=user, account_id=str(account.pk),
            amount=Decimal("100.00"), idempotency_key=fresh_key(),
        )

    def test_orm_update_of_completed_transaction_raises_permission_denied(
        self, user, make_account, system_accounts
    ):
        txn = self._make_completed_txn(user, make_account, system_accounts)
        assert txn.status == Transaction.Status.COMPLETED
        with pytest.raises(PermissionDenied):
            txn.amount = Decimal("999.00")
            txn.save()

    def test_raw_sql_update_of_completed_transaction_rejected(
        self, user, make_account, system_accounts
    ):
        txn = self._make_completed_txn(user, make_account, system_accounts)
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "UPDATE transactions_transaction SET amount = %s WHERE id = %s",
                        [Decimal("999.00"), str(txn.pk)],
                    )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg or "terminal" in msg

    def test_raw_sql_delete_of_completed_transaction_rejected(
        self, user, make_account, system_accounts
    ):
        txn = self._make_completed_txn(user, make_account, system_accounts)
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "DELETE FROM transactions_transaction WHERE id = %s",
                        [str(txn.pk)],
                    )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg or "terminal" in msg

    def test_pending_transaction_can_be_updated(self, user, make_account, system_accounts):
        """PENDING → COMPLETED is the legitimate transition; must not be blocked."""
        account = make_account(user)
        # A PENDING transaction (we'll create one manually to test the signal).
        txn = Transaction.objects.create(
            reference=f"TXN-TEST-{uuid.uuid4().hex[:8].upper()}",
            transaction_type=Transaction.TransactionType.DEPOSIT,
            amount=Decimal("10.00"),
            currency="USD",
            destination_account=account,
            initiated_by=user,
            status=Transaction.Status.PENDING,
        )
        # PENDING → COMPLETED must work (the signal only blocks COMPLETED/REVERSED updates).
        txn.status = Transaction.Status.COMPLETED
        txn.save(update_fields=["status", "updated_at"])
        txn.refresh_from_db()
        assert txn.status == Transaction.Status.COMPLETED


# ---------------------------------------------------------------------------
# TransactionAttempt immutability
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
class TestTransactionAttemptImmutability:

    def _make_attempt(self, user, make_account, system_accounts):
        account = make_account(user)
        # Trigger a refused attempt.
        with pytest.raises(Exception):
            withdraw(
                user=user, account_id=str(account.pk),
                amount=Decimal("999.00"), idempotency_key=fresh_key(),
            )
        return TransactionAttempt.objects.filter(initiated_by=user).first()

    def test_orm_update_raises_permission_denied(self, user, make_account, system_accounts):
        attempt = self._make_attempt(user, make_account, system_accounts)
        assert attempt is not None
        with pytest.raises(PermissionDenied):
            attempt.failure_reason = "tampered"
            attempt.save()

    def test_raw_sql_update_rejected_by_trigger(self, user, make_account, system_accounts):
        attempt = self._make_attempt(user, make_account, system_accounts)
        assert attempt is not None
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "UPDATE transactions_transactionattempt SET failure_reason = %s WHERE id = %s",
                        ["tampered", str(attempt.pk)],
                    )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg

    def test_raw_sql_delete_rejected_by_trigger(self, user, make_account, system_accounts):
        attempt = self._make_attempt(user, make_account, system_accounts)
        assert attempt is not None
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute(
                        "DELETE FROM transactions_transactionattempt WHERE id = %s",
                        [str(attempt.pk)],
                    )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg

    def test_queryset_update_rejected_by_trigger(self, user, make_account, system_accounts):
        """
        QuerySet.update() bypasses Django pre_save signals.
        Only the PostgreSQL trigger prevents this path.
        """
        attempt = self._make_attempt(user, make_account, system_accounts)
        assert attempt is not None
        with pytest.raises(Exception) as exc_info:
            with transaction.atomic():
                TransactionAttempt.objects.filter(pk=attempt.pk).update(
                    failure_reason="tampered via queryset"
                )
        msg = str(exc_info.value).lower()
        assert "monvex" in msg or "immutable" in msg
