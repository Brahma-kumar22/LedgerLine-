"""
users/apps.py

App configuration for the users application.
"""

from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    def ready(self) -> None:
        """
        Called once Django has fully loaded the app registry.
        Import signals here so they are connected without triggering
        circular imports during startup.
        """
        import users.signals  # noqa: F401
