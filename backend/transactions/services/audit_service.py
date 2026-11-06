"""
transactions/services/audit_service.py

Helpers that write TransactionAttempt and AuditLog records.

CRITICAL DESIGN CONSTRAINT:
----------------------------
TransactionAttempt and AuditLog records for REFUSED or FAILED operations
must survive a rollback of the financial transaction.

If the financial atomic() block rolls back (e.g. insufficient funds, DB
error), any AuditLog or TransactionAttempt rows written INSIDE that block
are also rolled back — losing the refusal record entirely.

Solution: write these records in a SEPARATE transaction AFTER the financial
block has already committed or rolled back.  The functions below are
deliberately designed to be called outside the financial atomic() block.

For SUCCESS cases the audit is written by the transaction signal handler
(transactions/signals.py), which fires after the commit.

Usage pattern in service functions:
    attempt_data = {...}  # build before entering atomic block
    try:
        with transaction.atomic():
            ... financial work ...
    except InsufficientFundsError as exc:
        record_refused_attempt(**attempt_data, reason=str(exc))
        raise
"""

from decimal import Decimal

from audit.models import AuditLog
from transactions.attempts import TransactionAttempt
from transactions.idempotency import IdempotencyRecord
from transactions.models import Transaction


def record_refused_attempt(
    *,
    user,
    transaction_type: str,
    account=None,
    amount: Decimal | None = None,
    currency: str = "USD",
    reason: str,
    idempotency_record: IdempotencyRecord | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Persist a TransactionAttempt with outcome=REFUSED and a matching AuditLog.

    Called when an operation is blocked BEFORE a Transaction row is created
    (e.g. insufficient funds, inactive account, authorization denied).

    Written in an independent transaction so it survives rollback of the
    financial block.
    """
    try:
        attempt = TransactionAttempt.objects.create(
            initiated_by=user,
            transaction_type=transaction_type,
            account=account,
            amount=amount,
            currency=currency,
            outcome=TransactionAttempt.Outcome.REFUSED,
            failure_reason=reason,
            transaction=None,
            idempotency_record=idempotency_record,
        )
        AuditLog.objects.create(
            actor=user,
            event_type=AuditLog.EventType.TRANSACTION_FAILED,
            resource_type="TransactionAttempt",
            resource_id=str(attempt.id),
            metadata={
                "transaction_type": transaction_type,
                "outcome":          "REFUSED",
                "reason":           reason,
                "amount":           str(amount) if amount is not None else None,
                "currency":         currency,
            },
            ip_address=ip_address,
        )
    except Exception:
        # Audit failure must never suppress the original error.
        pass


def record_successful_attempt(
    *,
    user,
    transaction_type: str,
    transaction_obj: Transaction,
    account=None,
    amount: Decimal,
    currency: str = "USD",
    idempotency_record: IdempotencyRecord | None = None,
) -> None:
    """
    Persist a TransactionAttempt with outcome=SUCCESS.
    Called after the financial transaction has committed.
    """
    try:
        TransactionAttempt.objects.create(
            initiated_by=user,
            transaction_type=transaction_type,
            account=account,
            amount=amount,
            currency=currency,
            outcome=TransactionAttempt.Outcome.SUCCESS,
            failure_reason="",
            transaction=transaction_obj,
            idempotency_record=idempotency_record,
        )
    except Exception:
        pass


def record_idempotency_replay(
    *,
    user,
    idempotency_record: IdempotencyRecord,
    ip_address: str | None = None,
) -> None:
    """Write an AuditLog entry when a duplicate request is replayed."""
    try:
        AuditLog.objects.create(
            actor=user,
            event_type=AuditLog.EventType.IDEMPOTENCY_REPLAY,
            resource_type="IdempotencyRecord",
            resource_id=str(idempotency_record.id),
            metadata={
                "idempotency_key": str(idempotency_record.idempotency_key),
                "status":          idempotency_record.status,
            },
            ip_address=ip_address,
        )
    except Exception:
        pass


def record_access_denied(
    *,
    user,
    transaction_type: str,
    reason: str,
    account=None,
    ip_address: str | None = None,
) -> None:
    """Write an AuditLog entry when authorization is denied."""
    try:
        AuditLog.objects.create(
            actor=user,
            event_type=AuditLog.EventType.ACCESS_DENIED,
            resource_type="Account",
            resource_id=str(account.pk) if account else "",
            metadata={
                "transaction_type": transaction_type,
                "reason":           reason,
            },
            ip_address=ip_address,
        )
    except Exception:
        pass
