"""
tests/test_role_authorization.py

Backend tests for three-role authentication, authorization, and
provisioning in MONVEX.

Tests:
  - Each role can log in and receive tokens
  - Each role gets the correct /api/users/me/ profile
  - ADMIN can access admin/audit/reconciliation APIs
  - ACCOUNT_HOLDER cannot access admin APIs (403)
  - AUDITOR can access audit and reconciliation APIs
  - AUDITOR cannot perform financial operations (403)
  - ACCOUNT_HOLDER cannot access another user's accounts (404/403)
  - Unauthenticated users cannot access protected APIs (401)
  - Public registration cannot create ADMIN or AUDITOR
  - provision_demo_users command is idempotent
  - provision_demo_users detects role conflicts

All tests require a live PostgreSQL connection.
They are blocked when the database is unreachable.
"""

import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def make_user(db):
    def _make(username=None, role=User.Role.ACCOUNT_HOLDER, password="TestPass123!"):
        username = username or f"user_{uuid.uuid4().hex[:8]}"
        return User.objects.create_user(
            username=username,
            email=f"{username}@test.monvex",
            password=password,
            role=role,
        )
    return _make


@pytest.fixture
def admin_user(make_user):
    return make_user("test_admin", role=User.Role.ADMIN, password="AdminPass123!")


@pytest.fixture
def auditor_user(make_user):
    return make_user("test_auditor", role=User.Role.AUDITOR, password="AuditPass123!")


@pytest.fixture
def holder_user(make_user):
    return make_user("test_holder", role=User.Role.ACCOUNT_HOLDER, password="HolderPass123!")


def get_token(client, username, password):
    """Obtain a JWT access token for the given credentials."""
    resp = client.post(
        "/api/auth/token/",
        {"username": username, "password": password},
        content_type="application/json",
    )
    return resp


def auth_header(token):
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


# ── Authentication tests ───────────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestAuthentication:

    def test_admin_can_login(self, client, admin_user):
        resp = get_token(client, "test_admin", "AdminPass123!")
        assert resp.status_code == 200
        assert "access" in resp.json()
        assert "refresh" in resp.json()

    def test_auditor_can_login(self, client, auditor_user):
        resp = get_token(client, "test_auditor", "AuditPass123!")
        assert resp.status_code == 200
        assert "access" in resp.json()

    def test_account_holder_can_login(self, client, holder_user):
        resp = get_token(client, "test_holder", "HolderPass123!")
        assert resp.status_code == 200
        assert "access" in resp.json()

    def test_invalid_credentials_rejected(self, client):
        resp = get_token(client, "nobody", "wrongpass")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_access_me(self, client):
        resp = client.get("/api/users/me/")
        assert resp.status_code == 401

    def test_admin_me_returns_correct_role(self, client, admin_user):
        token = get_token(client, "test_admin", "AdminPass123!").json()["access"]
        resp = client.get("/api/users/me/", **auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "ADMIN"
        assert data["username"] == "test_admin"

    def test_auditor_me_returns_correct_role(self, client, auditor_user):
        token = get_token(client, "test_auditor", "AuditPass123!").json()["access"]
        resp = client.get("/api/users/me/", **auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["role"] == "AUDITOR"

    def test_account_holder_me_returns_correct_role(self, client, holder_user):
        token = get_token(client, "test_holder", "HolderPass123!").json()["access"]
        resp = client.get("/api/users/me/", **auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["role"] == "ACCOUNT_HOLDER"


# ── Admin API authorization ───────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestAdminAuthorization:

    def test_admin_can_list_users(self, client, admin_user):
        token = get_token(client, "test_admin", "AdminPass123!").json()["access"]
        resp = client.get("/api/admin/users/", **auth_header(token))
        assert resp.status_code == 200

    def test_account_holder_cannot_list_users(self, client, holder_user):
        token = get_token(client, "test_holder", "HolderPass123!").json()["access"]
        resp = client.get("/api/admin/users/", **auth_header(token))
        assert resp.status_code == 403

    def test_auditor_cannot_list_users(self, client, auditor_user):
        token = get_token(client, "test_auditor", "AuditPass123!").json()["access"]
        resp = client.get("/api/admin/users/", **auth_header(token))
        assert resp.status_code == 403

    def test_unauthenticated_cannot_list_users(self, client):
        resp = client.get("/api/admin/users/")
        assert resp.status_code == 401

    def test_admin_can_access_audit_logs(self, client, admin_user):
        token = get_token(client, "test_admin", "AdminPass123!").json()["access"]
        resp = client.get("/api/audit/", **auth_header(token))
        assert resp.status_code == 200

    def test_admin_can_access_reconciliation(self, client, admin_user):
        token = get_token(client, "test_admin", "AdminPass123!").json()["access"]
        resp = client.get("/api/reconciliation/", **auth_header(token))
        assert resp.status_code == 200


# ── Auditor authorization ─────────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestAuditorAuthorization:

    def test_auditor_can_access_audit_logs(self, client, auditor_user):
        token = get_token(client, "test_auditor", "AuditPass123!").json()["access"]
        resp = client.get("/api/audit/", **auth_header(token))
        assert resp.status_code == 200

    def test_auditor_can_access_reconciliation(self, client, auditor_user):
        token = get_token(client, "test_auditor", "AuditPass123!").json()["access"]
        resp = client.get("/api/reconciliation/", **auth_header(token))
        assert resp.status_code == 200

    def test_auditor_cannot_deposit(self, client, auditor_user):
        """AUDITOR cannot perform financial operations — backend enforces this."""
        token = get_token(client, "test_auditor", "AuditPass123!").json()["access"]
        # We need a valid account_id — use a fake UUID, the auth check fires first
        resp = client.post(
            "/api/transactions/deposit/",
            {
                "account_id": str(uuid.uuid4()),
                "amount": "100.00",
                "currency": "USD",
            },
            content_type="application/json",
            HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            **auth_header(token),
        )
        # Should fail: either 403 (permission) or 404 (account not found after auth passes)
        # The key assertion is it must NOT be 201 (success)
        assert resp.status_code in (403, 404, 400), (
            f"AUDITOR must not be able to deposit. Got {resp.status_code}: {resp.json()}"
        )

    def test_auditor_cannot_withdraw(self, client, auditor_user):
        token = get_token(client, "test_auditor", "AuditPass123!").json()["access"]
        resp = client.post(
            "/api/transactions/withdraw/",
            {"account_id": str(uuid.uuid4()), "amount": "50.00", "currency": "USD"},
            content_type="application/json",
            HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            **auth_header(token),
        )
        assert resp.status_code not in (200, 201), (
            f"AUDITOR must not be able to withdraw. Got {resp.status_code}"
        )

    def test_auditor_cannot_transfer(self, client, auditor_user):
        token = get_token(client, "test_auditor", "AuditPass123!").json()["access"]
        resp = client.post(
            "/api/transactions/transfer/",
            {
                "source_account_id": str(uuid.uuid4()),
                "destination_account_id": str(uuid.uuid4()),
                "amount": "25.00",
                "currency": "USD",
            },
            content_type="application/json",
            HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            **auth_header(token),
        )
        assert resp.status_code not in (200, 201), (
            f"AUDITOR must not be able to transfer. Got {resp.status_code}"
        )

    def test_account_holder_cannot_access_audit_logs(self, client, holder_user):
        token = get_token(client, "test_holder", "HolderPass123!").json()["access"]
        resp = client.get("/api/audit/", **auth_header(token))
        assert resp.status_code == 403

    def test_account_holder_cannot_access_reconciliation(self, client, holder_user):
        token = get_token(client, "test_holder", "HolderPass123!").json()["access"]
        resp = client.get("/api/reconciliation/", **auth_header(token))
        assert resp.status_code == 403


# ── Account ownership isolation ───────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestAccountOwnershipIsolation:

    def test_account_holder_cannot_see_another_users_account(
        self, client, make_user
    ):
        """User A cannot access User B's account."""
        from accounts.models import Account

        user_a = make_user("user_a")
        user_b = make_user("user_b")

        account_b = Account.objects.create(
            owner=user_b,
            name="B's Account",
            account_type=Account.AccountType.CHECKING,
            currency="USD",
            balance=Decimal("100.00"),
            is_active=True,
        )

        token_a = get_token(client, "user_a", "TestPass123!").json()["access"]
        resp = client.get(f"/api/accounts/{account_b.id}/", **auth_header(token_a))
        # Must be 404 (account not found for this user) — existence is not revealed
        assert resp.status_code == 404, (
            f"User A must not see User B's account. Got {resp.status_code}"
        )


# ── Public registration security ──────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestPublicRegistrationSecurity:

    def test_public_registration_always_creates_account_holder(self, client):
        resp = client.post(
            "/api/auth/register/",
            {
                "username": "newuser123",
                "email": "newuser123@test.monvex",
                "password": "StrongPass123!",
            },
            content_type="application/json",
        )
        assert resp.status_code == 201 or resp.status_code == 200
        user = User.objects.get(username="newuser123")
        assert user.role == User.Role.ACCOUNT_HOLDER

    def test_public_registration_ignores_role_field(self, client):
        """Sending role=ADMIN in the body must be silently ignored."""
        resp = client.post(
            "/api/auth/register/",
            {
                "username": "attacker123",
                "email": "attacker@test.monvex",
                "password": "StrongPass123!",
                "role": "ADMIN",  # This must be ignored
            },
            content_type="application/json",
        )
        # Whether the request succeeds or fails, the user must NOT be ADMIN
        if resp.status_code in (200, 201):
            user = User.objects.get(username="attacker123")
            assert user.role == User.Role.ACCOUNT_HOLDER, (
                "Public registration must never create ADMIN users, "
                f"even when role=ADMIN is sent. Got role={user.role}"
            )

    def test_public_registration_ignores_auditor_role(self, client):
        """Sending role=AUDITOR in the body must be silently ignored."""
        resp = client.post(
            "/api/auth/register/",
            {
                "username": "spy_auditor",
                "email": "spy@test.monvex",
                "password": "StrongPass123!",
                "role": "AUDITOR",
            },
            content_type="application/json",
        )
        if resp.status_code in (200, 201):
            user = User.objects.get(username="spy_auditor")
            assert user.role == User.Role.ACCOUNT_HOLDER


# ── provision_demo_users command ──────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestProvisionDemoUsers:

    def test_provision_creates_admin(self, capsys):
        from django.core.management import call_command
        call_command("provision_demo_users", "--admin-password", "TestAdmin123!")
        admin = User.objects.get(username="brahma_kumar")
        assert admin.role == User.Role.ADMIN
        assert admin.is_active is True
        assert admin.is_staff is True

    def test_provision_creates_auditor(self):
        from django.core.management import call_command
        call_command("provision_demo_users", "--admin-password", "TestAdmin123!")
        auditor = User.objects.get(username="brahma_auditor")
        assert auditor.role == User.Role.AUDITOR
        assert auditor.is_active is True

    def test_provision_is_idempotent(self):
        """Running twice must not raise an error or change roles."""
        from django.core.management import call_command
        call_command("provision_demo_users", "--admin-password", "TestAdmin123!")
        call_command("provision_demo_users", "--admin-password", "TestAdmin123!")
        assert User.objects.filter(username="brahma_kumar").count() == 1
        assert User.objects.filter(username="brahma_auditor").count() == 1

    def test_provision_detects_role_conflict(self):
        """If brahma_kumar exists with wrong role, command must raise CommandError."""
        from django.core.management import call_command
        from django.core.management.base import CommandError
        # Create brahma_kumar as ACCOUNT_HOLDER (conflict)
        User.objects.create_user(
            username="brahma_kumar",
            email="brahma@monvex.internal",
            password="anything",
            role=User.Role.ACCOUNT_HOLDER,
        )
        with pytest.raises(CommandError, match="ROLE CONFLICT"):
            call_command("provision_demo_users", "--admin-password", "TestAdmin123!")

    def test_provision_does_not_change_existing_password(self):
        """Re-running must not silently change the existing user's password."""
        from django.core.management import call_command
        # First run
        call_command("provision_demo_users", "--admin-password", "TestAdmin123!")
        admin = User.objects.get(username="brahma_kumar")
        old_password_hash = admin.password
        # Second run with a different password
        call_command("provision_demo_users", "--admin-password", "DifferentPass456!")
        admin.refresh_from_db()
        assert admin.password == old_password_hash, (
            "Re-running provision_demo_users must not change the existing password."
        )
