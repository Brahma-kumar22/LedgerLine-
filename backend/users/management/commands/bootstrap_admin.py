"""
users/management/commands/bootstrap_admin.py

Management command: python manage.py bootstrap_admin

Creates the first MONVEX administrator account securely.

SECURITY DESIGN:
----------------
- This command is the ONLY authorised path for creating the initial ADMIN.
- It is never reachable through the public API or public registration.
- Credentials are collected via getpass (no echo to terminal or logs).
- The command refuses to create a second bootstrap admin if one already
  exists, preventing accidental duplicate admin accounts.
- is_staff and is_superuser are set so the admin can access the Django
  admin panel and create further AUDITOR / ADMIN accounts there.

USAGE:
    python manage.py bootstrap_admin

IDEMPOTENCY:
    Safe to run multiple times.  If a User with role=ADMIN already exists,
    the command prints a message and exits without creating anything.
    If you need to add a second admin, use the Django admin panel while
    authenticated as the existing admin.

NOTE ON createsuperuser:
    Django's built-in createsuperuser sets is_superuser=True but leaves
    role=ACCOUNT_HOLDER (the model default).  This leaves a Django superuser
    with insufficient MONVEX privileges.  Always use bootstrap_admin instead.
    If createsuperuser was used accidentally, correct the role in the admin
    panel: set role=ADMIN for the affected user.
"""

import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from users.models import User


class Command(BaseCommand):
    help = (
        "Bootstrap the first MONVEX administrator account. "
        "Run once after the initial migration."
    )

    def handle(self, *args, **options) -> None:
        # ---------------------------------------------------------------
        # Guard: refuse if an ADMIN already exists.
        # ---------------------------------------------------------------
        if User.objects.filter(role=User.Role.ADMIN).exists():
            self.stdout.write(
                self.style.WARNING(
                    "An ADMIN user already exists. "
                    "Use the Django admin panel to add further administrators."
                )
            )
            return

        self.stdout.write(self.style.MIGRATE_HEADING("MONVEX — Bootstrap Administrator"))
        self.stdout.write(
            "This creates the first administrator account.\n"
            "Credentials are NOT echoed to the terminal.\n"
        )

        # ---------------------------------------------------------------
        # Collect credentials securely.
        # ---------------------------------------------------------------
        username = self._prompt("Username: ")
        email    = self._prompt("Email address: ")

        password = getpass.getpass("Password: ")
        password_confirm = getpass.getpass("Password (again): ")

        if password != password_confirm:
            raise CommandError("Passwords do not match.")

        # ---------------------------------------------------------------
        # Validate password against Django's configured validators.
        # ---------------------------------------------------------------
        try:
            # Create a temporary unsaved user so the similarity validator
            # can compare the password against the username/email.
            temp_user = User(username=username, email=email)
            validate_password(password, user=temp_user)
        except ValidationError as exc:
            raise CommandError(
                "Password validation failed:\n  " + "\n  ".join(exc.messages)
            )

        # ---------------------------------------------------------------
        # Verify username is not taken.
        # ---------------------------------------------------------------
        if User.objects.filter(username=username).exists():
            raise CommandError(f"A user with username '{username}' already exists.")

        if User.objects.filter(email=email).exists():
            raise CommandError(f"A user with email '{email}' already exists.")

        # ---------------------------------------------------------------
        # Create the admin user.
        # ---------------------------------------------------------------
        admin = User.objects.create_user(
            username=username,
            email=email,
            password=password,          # Hashed by create_user().
            role=User.Role.ADMIN,       # Explicitly set — never ACCOUNT_HOLDER default.
            is_staff=True,              # Required for Django admin panel access.
            is_superuser=True,          # Required for full Django admin permissions.
        )

        # ---------------------------------------------------------------
        # Write an audit log entry for this privileged action.
        # ---------------------------------------------------------------
        try:
            from audit.models import AuditLog
            AuditLog.objects.create(
                actor=None,             # System action — no acting user yet.
                event_type=AuditLog.EventType.BOOTSTRAP_ADMIN_CREATED,
                resource_type="User",
                resource_id=str(admin.id),
                metadata={
                    "username": admin.username,
                    "email":    admin.email,
                    "role":     admin.role,
                    # Do NOT log the password, even hashed.
                },
            )
        except Exception as audit_exc:
            # Audit failure is non-fatal — the admin was created successfully.
            self.stderr.write(
                self.style.WARNING(
                    f"Admin created but audit log entry failed: {audit_exc}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nAdministrator '{admin.username}' created successfully.\n"
                f"Role: {admin.role}\n"
                f"Django admin panel: http://127.0.0.1:8000/admin/\n"
                f"\nNever share this account's credentials.\n"
                f"Use the admin panel to create AUDITOR accounts as needed."
            )
        )

    # ---------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------

    def _prompt(self, label: str) -> str:
        """Prompt for a non-empty string value."""
        while True:
            value = input(label).strip()
            if value:
                return value
            self.stderr.write("This field cannot be empty.")
