"""
ledger/apps.py

App configuration for the ledger application.
"""

from django.apps import AppConfig


class LedgerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ledger"

    def ready(self) -> None:
        import ledger.signals  # noqa: F401
