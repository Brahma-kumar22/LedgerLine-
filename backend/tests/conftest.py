"""
tests/conftest.py

Shared pytest fixtures for MONVEX.

DATABASE STRATEGY:
    - All tests use the real Neon PostgreSQL database via @pytest.mark.django_db.
    - Tests are wrapped in transactions and rolled back after each test, so
      no test data persists across test runs.
    - Concurrency tests that require separate connections use
      @pytest.mark.django_db(transaction=True) and clean up explicitly.
    - NO SQLite is used anywhere.

SYSTEM ACCOUNT FIXTURE:
    The `system_accounts` fixture provisions EXTERNAL_FUNDING and
    EXTERNAL_SETTLEMENT using account_tag lookup, which is idempotent.
    It also updates Django settings so the service layer can find them.
"""

import uuid
from decimal import Decimal

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model

from accounts.models import Account
from transactions.services.ledger_service import _get_system_account

User = get_user_model()


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def make_user(db):
    """Factory: create a unique ACCOUNT_HOLDER user."""
    def _make(username=None, role=User.Role.ACCOUNT_HOLDER):
        username = username or f"user_{uuid.uuid4().hex[:8]}"
        u = User.objects.create_user(
            username=username,
            email=f"{username}@test.monvex",
            password="TestPass123!",
            role=role,
        )
        return u
    return _make


@pytest.fixture
def user(make_user):
    return make_user("alice")


@pytest.fixture
def user2(make_user):
    return make_user("bob")


@pytest.fixture
def auditor_user(make_user):
    return make_user("auditor1", role=User.Role.AUDITOR)


# ---------------------------------------------------------------------------
# System account fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def system_accounts(db):
    """
    Ensure EXTERNAL_FUNDING and EXTERNAL_SETTLEMENT accounts exist.
    Uses account_tag as the idempotent key.
    Updates Django settings so _get_system_account() can find them.
    """
    # Create a minimal system owner if none exists.
    owner, _ = User.objects.get_or_create(
        username="monvex_system",
        defaults={
            "email": "system@monvex.internal",
            "role": User.Role.ADMIN,
            "is_staff": True,
            "is_superuser": True,
        },
    )

    funding, _ = Account.objects.get_or_create(
        account_tag="EXTERNAL_FUNDING",
        defaults={
            "owner": owner,
            "name": "External Funding (System)",
            "account_type": Account.AccountType.WALLET,
            "currency": "USD",
            "balance": Decimal("0"),
            "is_active": True,
            "is_system_account": True,
        },
    )
    settlement, _ = Account.objects.get_or_create(
        account_tag="EXTERNAL_SETTLEMENT",
        defaults={
            "owner": owner,
            "name": "External Settlement (System)",
            "account_type": Account.AccountType.WALLET,
            "currency": "USD",
            "balance": Decimal("0"),
            "is_active": True,
            "is_system_account": True,
        },
    )

    settings.EXTERNAL_FUNDING_ACCOUNT_ID    = str(funding.pk)
    settings.EXTERNAL_SETTLEMENT_ACCOUNT_ID = str(settlement.pk)

    return {"funding": funding, "settlement": settlement}


# ---------------------------------------------------------------------------
# Account factory
# ---------------------------------------------------------------------------

@pytest.fixture
def make_account(db, system_accounts):
    """Factory: create a customer Account with a given balance."""
    def _make(owner, balance=Decimal("0"), currency="USD",
              account_type=Account.AccountType.CHECKING):
        return Account.objects.create(
            owner=owner,
            name=f"Account-{uuid.uuid4().hex[:6]}",
            account_type=account_type,
            currency=currency,
            balance=balance,
            is_active=True,
        )
    return _make


# ---------------------------------------------------------------------------
# Idempotency key helper
# ---------------------------------------------------------------------------

@pytest.fixture
def new_key():
    """Return a fresh UUID string suitable as an idempotency key."""
    def _key():
        return str(uuid.uuid4())
    return _key
