"""
audit/apps.py

App configuration for the audit application.
"""

from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "audit"

    def ready(self) -> None:
        import audit.signals  # noqa: F401
