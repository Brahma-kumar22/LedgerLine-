"""
accounts/signals.py

Django signal handlers for the accounts application.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Account


@receiver(post_save, sender=Account)
def write_account_audit_log(sender, instance: Account, created: bool, **kwargs) -> None:
    """Write an AuditLog entry when an Account is created or deactivated."""
    try:
        from audit.models import AuditLog

        if created:
            AuditLog.objects.create(
                actor=None,
                event_type=AuditLog.EventType.ACCOUNT_CREATED,
                resource_type="Account",
                resource_id=str(instance.id),
                metadata={
                    "account_number": instance.account_number,
                    "account_type":   instance.account_type,
                    "currency":       instance.currency,
                    "owner_id":       str(instance.owner_id),
                },
            )
        elif not instance.is_active:
            AuditLog.objects.create(
                actor=None,
                event_type=AuditLog.EventType.ACCOUNT_DEACTIVATED,
                resource_type="Account",
                resource_id=str(instance.id),
                metadata={"account_number": instance.account_number},
            )
    except Exception:
        pass
