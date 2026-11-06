"""
transactions/apps.py

App configuration for the transactions application.

Two important signal categories are registered here:

1. IMMUTABILITY SIGNALS:
   pre_save signals on Transaction and TransactionAttempt that raise an
   error if application code tries to UPDATE an existing record that
   should be immutable (COMPLETED/REVERSED transactions, all attempts).
   This catches ORM-level modifications; the PostgreSQL trigger catches
   raw SQL modifications.

2. AUDIT SIGNALS:
   post_save signals on Transaction that write AuditLog entries for
   transaction lifecycle events.
"""

from django.apps import AppConfig


class TransactionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "transactions"

    def ready(self) -> None:
        import transactions.signals  # noqa: F401
