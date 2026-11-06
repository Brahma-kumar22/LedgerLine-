"""
audit/signals.py

Signal handlers for the audit application.

IMMUTABILITY — APPLICATION LAYER:
----------------------------------
pre_save on AuditLog: blocks ORM-level UPDATEs.

Uses instance._state.adding (not instance.pk is not None) because Django
assigns UUID PKs before save(), making pk always non-None for new rows too.
"""

from django.core.exceptions import PermissionDenied
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import AuditLog


@receiver(pre_save, sender=AuditLog)
def enforce_audit_log_immutability(sender, instance: AuditLog, **kwargs) -> None:
    """
    Block ORM-level UPDATEs on AuditLog rows.

    instance._state.adding True  → INSERT, allowed.
    instance._state.adding False → UPDATE, always blocked.
    """
    if not instance._state.adding:
        raise PermissionDenied(
            f"AuditLog {instance.pk} is immutable and cannot be modified. "
            "Audit records are the legal record of system events."
        )
