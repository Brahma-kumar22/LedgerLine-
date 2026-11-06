"""
users/management/commands/create_system_accounts.py

Creates the two notional system clearing accounts required for double-entry
external accounting:

    EXTERNAL_FUNDING    — notional source for all inbound deposits
    EXTERNAL_SETTLEMENT — notional sink for all outbound withdrawals

IDEMPOTENCY AND CONCURRENCY SAFETY:
------------------------------------
System accounts are identified by their `account_tag` field, which has a
database-level UNIQUE constraint.  Concurrent calls cannot create duplicates:
the second INSERT will raise IntegrityError and be rolled back.

`get_or_create(account_tag=...)` uses that unique constraint as the lookup
key, not the mutable `name` field.  This is safe under concurrent execution.

DOES NOT REQUIRE AN ADMINISTRATOR:
------------------------------------
System accounts are owned by the first available ADMIN user if one exists,
or by a freshly created non-interactive system user if not.  This removes
the dependency on `bootstrap_admin` being run first.

AFTER RUNNING:
--------------
Copy the printed UUIDs into .env:

    EXTERNAL_FUNDING_ACCOUNT_ID=<uuid>
    EXTERNAL_SETTLEMENT_ACCOUNT_ID=<uuid>

The command is safe to run multiple times — it always prints the current UUIDs.
"""

from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction

from accounts.models import Account
from users.models import User


SYSTEM_ACCOUNTS = [
    {
        "tag":          "EXTERNAL_FUNDING",
        "name":         "External Funding (System)",
        "setting_key":  "EXTERNAL_FUNDING_ACCOUNT_ID",
        "description":  "Notional source for all customer deposits.",
    },
    {
        "tag":          "EXTERNAL_SETTLEMENT",
        "name":         "External Settlement (System)",
        "setting_key":  "EXTERNAL_SETTLEMENT_ACCOUNT_ID",
        "description":  "Notional sink for all customer withdrawals.",
    },
]


def _get_or_create_system_owner() -> User:
    """
    Return an ADMIN user to own the system accounts.
    Does not require an existing admin — creates a non-interactive
    system user if none exists.
    """
    admin = User.objects.filter(role=User.Role.ADMIN).first()
    if admin:
        return admin

    # Create a non-interactive system user with an unusable random password.
    import os
    system_user, created = User.objects.get_or_create(
        username="monvex_system",
        defaults={
            "email":        "system@monvex.internal",
            "role":         User.Role.ADMIN,
            "is_staff":     True,
            "is_superuser": True,
        },
    )
    if created:
        # Set a random unusable password — this account cannot log in.
        system_user.set_unusable_password()
        system_user.save(update_fields=["password"])
    return system_user


class Command(BaseCommand):
    help = "Create system clearing accounts (idempotent, concurrency-safe)."

    def handle(self, *args, **options):
        owner = _get_or_create_system_owner()
        self.stdout.write(f"System account owner: {owner.username} ({owner.pk})")

        results = []
        for spec in SYSTEM_ACCOUNTS:
            account, created = self._provision(owner, spec)
            results.append((spec["setting_key"], account, created))

        self.stdout.write(
            self.style.SUCCESS("\nSystem accounts ready.\nAdd to .env:\n")
        )
        for setting_key, account, created in results:
            verb = "Created" if created else "Existing"
            self.stdout.write(f"  {setting_key}={account.pk}  [{verb}]")

    def _provision(self, owner: User, spec: dict) -> tuple[Account, bool]:
        """
        Provision one system account using account_tag as the unique key.
        Safe under concurrent execution — the UNIQUE constraint on account_tag
        prevents duplicate rows even if two processes run simultaneously.
        """
        try:
            with transaction.atomic():
                account, created = Account.objects.get_or_create(
                    account_tag=spec["tag"],
                    defaults={
                        "owner":             owner,
                        "name":              spec["name"],
                        "account_type":      Account.AccountType.WALLET,
                        "currency":          "USD",
                        "balance":           0,
                        "is_active":         True,
                        "is_system_account": True,
                    },
                )
            return account, created
        except IntegrityError:
            # Another process created it concurrently — fetch and return.
            account = Account.objects.get(account_tag=spec["tag"])
            return account, False
