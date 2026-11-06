"""
transactions/signals.py

Signal handlers for the transactions application.

UUID PK NOTE:
    Django assigns UUID primary keys before calling save(), so
    instance.pk is always non-None even for new inserts.
    Use instance._state.adding to distinguish INSERT (True) from UPDATE (False).

TRANSACTION IMMUTABILITY:
    Once a Transaction reaches status=COMPLETED or REVERSED, it is terminal.
    Any subsequent save() that would UPDATE the row is blocked here.
    New inserts (status=PENDING) are always allowed.

TRANSACTIONATTEMPT IMMUTABILITY:
    TransactionAttempt rows are append-only from creation.
    Any update attempt is blocked regardless of content.
"""

from django.core.exceptions import PermissionDenied
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Transaction
from .attempts import TransactionAttempt


TERMINAL_STATUSES = {Transaction.Status.COMPLETED, Transaction.Status.REVERSED}


# ---------------------------------------------------------------------------
# Transaction immutability
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=Transaction)
def enforce_transaction_immutability(sender, instance: Transaction, **kwargs) -> None:
    """
    Block ORM updates on Transactions that are already in a terminal state.

    INSERT (instance._state.adding=True) is always allowed — this is
    how new PENDING transactions are created.

    For UPDATEs, fetch the current DB status and block if it's terminal.
    The PENDING → COMPLETED transition is the only permitted update.
    """
    if instance._state.adding:
        return  # New INSERT — always allow.

    try:
        current = Transaction.objects.only("status").get(pk=instance.pk)
    except Transaction.DoesNotExist:
        return  # Race condition — treat as new.

    if current.status in TERMINAL_STATUSES:
        raise PermissionDenied(
            f"Transaction {instance.pk} is in terminal state "
            f"'{current.status}' and cannot be modified. "
            "Create a new REVERSAL transaction instead."
        )


# ---------------------------------------------------------------------------
# Transaction audit log
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Transaction)
def write_transaction_audit_log(
    sender, instance: Transaction, created: bool, **kwargs
) -> None:
    """Write an AuditLog entry for transaction lifecycle events."""
    try:
        from audit.models import AuditLog

        if created:
            event = AuditLog.EventType.TRANSACTION_CREATED
        elif instance.status == Transaction.Status.COMPLETED:
            event = AuditLog.EventType.TRANSACTION_COMPLETED
        elif instance.status == Transaction.Status.FAILED:
            event = AuditLog.EventType.TRANSACTION_FAILED
        elif instance.status == Transaction.Status.REVERSED:
            event = AuditLog.EventType.TRANSACTION_REVERSED
        else:
            return

        AuditLog.objects.create(
            actor_id=instance.initiated_by_id,
            event_type=event,
            resource_type="Transaction",
            resource_id=str(instance.id),
            metadata={
                "reference":             instance.reference,
                "type":                  instance.transaction_type,
                "amount":                str(instance.amount),
                "currency":              instance.currency,
                "status":                instance.status,
                "source_account":        str(instance.source_account_id)      if instance.source_account_id      else None,
                "destination_account":   str(instance.destination_account_id) if instance.destination_account_id else None,
            },
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# TransactionAttempt immutability
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=TransactionAttempt)
def enforce_attempt_immutability(
    sender, instance: TransactionAttempt, **kwargs
) -> None:
    """
    TransactionAttempt rows are append-only.
    Block any UPDATE (instance._state.adding is False).
    """
    if not instance._state.adding:
        raise PermissionDenied(
            f"TransactionAttempt {instance.pk} is immutable and cannot be modified."
        )
