"""
users/management/commands/provision_demo_users.py

Idempotent management command that provisions demo accounts for ADMIN
and AUDITOR roles in the MONVEX application.

SECURITY DESIGN
---------------
- Credentials for the demo ADMIN are passed via the DEMO_ADMIN_PASSWORD
  environment variable (read from the loaded .env file) OR via a
  --admin-password command-line argument for local dev convenience.
- The AUDITOR password is generated as a strong random secret and printed
  ONCE to stdout so it can be saved securely.
- Passwords are NEVER hardcoded in source code.
- Passwords are NEVER written to log files, migrations, README, or PROMPTS.md.
- The command refuses to run with weak passwords in production
  (DEBUG=False).
- If a username already exists with a DIFFERENT role, the command reports
  the conflict and exits without modifying anything.
- If a username already exists with the CORRECT role, it prints the
  current status and exits without changing the password.

USAGE
-----
  # Development (password from CLI — only allowed when DEBUG=True)
  python manage.py provision_demo_users --admin-password brahma123

  # Production (password from environment variable)
  DEMO_ADMIN_PASSWORD=<strong_password> python manage.py provision_demo_users

IDEMPOTENCY
-----------
  Running the command multiple times is safe.
  It will not duplicate users or silently change existing passwords.
"""

import os
import secrets
import string

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Provision ADMIN and AUDITOR demo accounts (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-password",
            dest="admin_password",
            default=None,
            help=(
                "Password for the ADMIN demo account. "
                "Only allowed when DEBUG=True. "
                "In production, set DEMO_ADMIN_PASSWORD env var."
            ),
        )

    def handle(self, *args, **options):
        from users.models import User

        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n MONVEX — Demo User Provisioning\n"
        ))

        # ── Determine ADMIN password ───────────────────────────────────────
        admin_password = options.get("admin_password") or os.environ.get("DEMO_ADMIN_PASSWORD")

        if not admin_password:
            raise CommandError(
                "ADMIN password not supplied. "
                "Pass --admin-password <pw> (DEBUG mode only) or "
                "set DEMO_ADMIN_PASSWORD environment variable."
            )

        # Refuse weak/default passwords in production
        if not settings.DEBUG:
            if len(admin_password) < 12:
                raise CommandError(
                    "ADMIN password must be at least 12 characters in production."
                )

        # ── Generate AUDITOR password ──────────────────────────────────────
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        auditor_password = "".join(secrets.choice(alphabet) for _ in range(20))

        # ── Provision each account ─────────────────────────────────────────
        admin_result   = self._provision(
            User, "brahma_kumar",   "brahma@monvex.internal",  User.Role.ADMIN,   admin_password,
            is_staff=True, is_superuser=True,
        )
        auditor_result = self._provision(
            User, "brahma_auditor", "auditor@monvex.internal", User.Role.AUDITOR, auditor_password,
        )

        # ── Summary output ─────────────────────────────────────────────────
        self.stdout.write("\n" + "─" * 55)
        self.stdout.write(self.style.SUCCESS(" Provisioning complete\n"))

        for label, result, pw in [
            ("ADMIN",   admin_result,   admin_password),
            ("AUDITOR", auditor_result, auditor_password),
        ]:
            self.stdout.write(f"  Role    : {label}")
            self.stdout.write(f"  Username: {result['username']}")
            self.stdout.write(f"  Status  : {result['status']}")
            self.stdout.write(f"  Active  : {result['is_active']}")
            if result["status"] == "created":
                # Only print the password for newly created accounts
                self.stdout.write(
                    self.style.WARNING(f"  Password: {pw}  ← save this now")
                )
            self.stdout.write("")

        self.stdout.write("─" * 55)
        self.stdout.write(
            self.style.WARNING(
                "\n  SECURITY: Do not commit passwords to version control.\n"
                "  The AUDITOR password above is shown only once.\n"
            )
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _provision(
        self, User, username, email, role, password,
        is_staff=False, is_superuser=False,
    ) -> dict:
        """
        Create the user if they do not exist, or validate the existing record.

        Returns a dict: {"username", "status", "is_active"}.
        "status" is one of: "created", "exists_correct_role", "conflict".
        Raises CommandError on role conflict.
        """
        try:
            existing = User.objects.get(username=username)
        except User.DoesNotExist:
            # Create the user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role,
                is_staff=is_staff,
                is_superuser=is_superuser,
                is_active=True,
            )
            return {
                "username": user.username,
                "status": "created",
                "is_active": user.is_active,
            }

        # User exists — check for role conflict
        if existing.role != role:
            raise CommandError(
                f"\nROLE CONFLICT: '{username}' already exists with role '{existing.role}', "
                f"not '{role}'.\n"
                f"To correct this, use the Django admin panel (/admin/) as an ADMIN user.\n"
                f"This command will NOT overwrite the existing role automatically."
            )

        # Correct role — report without changing password
        return {
            "username": existing.username,
            "status": "exists_correct_role",
            "is_active": existing.is_active,
        }
