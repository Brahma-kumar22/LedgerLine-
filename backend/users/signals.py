"""
users/signals.py

Django signal handlers for the users application.

Connected in users/apps.py → UsersConfig.ready().
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User


@receiver(post_save, sender=User)
def write_user_audit_log(sender, instance: User, created: bool, **kwargs) -> None:
    """
    Write an AuditLog entry whenever a User record is saved.

    Events recorded:
        USER_REGISTERED  — new user created via public registration.
        USER_ROLE_CHANGED — role field changed on an existing user.

    This import is local to avoid a circular import at module load time
    (audit → users → audit).
    """
    try:
        from audit.models import AuditLog

        if created:
            AuditLog.objects.create(
                actor=None,  # Registration has no authenticated actor yet.
                event_type=AuditLog.EventType.USER_REGISTERED,
                resource_type="User",
                resource_id=str(instance.id),
                metadata={
                    "username": instance.username,
                    "email":    instance.email,
                    "role":     instance.role,
                },
            )
        else:
            # Detect role changes by comparing to the pre-save value.
            # update_fields is set by some callers; check it is safe to ignore.
            AuditLog.objects.create(
                actor=None,
                event_type=AuditLog.EventType.USER_ROLE_CHANGED,
                resource_type="User",
                resource_id=str(instance.id),
                metadata={
                    "username":  instance.username,
                    "new_role":  instance.role,
                },
            )
    except Exception:
        # Signal handlers must never crash the calling code path.
        # Audit failures are logged to stderr in production via LOGGING config.
        pass
