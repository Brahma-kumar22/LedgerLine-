"""
ledger/signals.py

Signal handlers for the ledger application.

IMMUTABILITY — APPLICATION LAYER:
----------------------------------
pre_save on LedgerEntry: raises PermissionDenied when ORM code tries to
UPDATE an existing ledger entry.

CRITICAL — UUID PK PITFALL:
    Django assigns UUID primary keys (via the field's default=uuid.uuid4)
    BEFORE calling save(), so instance.pk is always non-None even for brand-
    new inserts.  The correct way to distinguish INSERT from UPDATE is:

        instance._state.adding  →  True  for new rows (INSERT)
                                →  False for existing rows (UPDATE)

    Using `instance.pk is not None` would block every insert — that was the
    original bug.  This file uses _state.adding correctly.

The PostgreSQL trigger (ledger/migrations/0003_immutability_triggers.py)
covers the raw-SQL path where signals don't fire.
"""

from django.core.exceptions import PermissionDenied
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import LedgerEntry


@receiver(pre_save, sender=LedgerEntry)
def enforce_ledger_immutability(sender, instance: LedgerEntry, **kwargs) -> None:
    """
    Block ORM-level UPDATEs on LedgerEntry rows.

    instance._state.adding is True  → brand-new INSERT, always allowed.
    instance._state.adding is False → UPDATE of an existing row, always blocked.
    """
    if not instance._state.adding:
        raise PermissionDenied(
            f"LedgerEntry {instance.pk} is immutable and cannot be modified. "
            "Financial records are append-only."
        )


@receiver(post_save, sender=LedgerEntry)
def write_ledger_audit_log(
    sender, instance: LedgerEntry, created: bool, **kwargs
) -> None:
    """Write an AuditLog entry whenever a new LedgerEntry is created."""
    if not created:
        return

    try:
        from audit.models import AuditLog
        AuditLog.objects.create(
            actor_id=instance.initiated_by_id,
            event_type=AuditLog.EventType.LEDGER_ENTRY_WRITTEN,
            resource_type="LedgerEntry",
            resource_id=str(instance.id),
            metadata={
                "transaction_id": str(instance.transaction_id),
                "account_id":     str(instance.account_id),
                "entry_type":     instance.entry_type,
                "amount":         str(instance.amount),
                "currency":       instance.currency,
                "balance_after":  str(instance.balance_after),
            },
        )
    except Exception:
        pass
