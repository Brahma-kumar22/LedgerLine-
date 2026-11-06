"""
transactions/services/authorization.py

Account-level authorization checks for the MONVEX service layer.

RULES:
    1. Account owner → implicit full access to all operations.
    2. Non-owner with AccountAccess grant for the required permission → allowed.
    3. Anyone else → AuthorizationError.
    4. AUDITOR role → read-only; always refused for money-moving operations.
    5. ADMIN role → cannot move money on behalf of users;
       admin operations are documented separately.

These checks are performed INSIDE the service layer, not only at the API
boundary.  This prevents a compromised view from bypassing authorization.
"""

from accounts.models import Account, AccountAccess
from users.models import User

from .exceptions import (
    AccountInactiveError,
    AccountNotFoundError,
    AuthorizationError,
)


def get_account_or_raise(account_id: str, user: User) -> Account:
    """
    Fetch an Account by UUID and verify the requesting user can see it.

    Returns the Account instance if visible.
    Raises AccountNotFoundError if it does not exist.
    Raises AuthorizationError if the user has no access at all.

    IMPORTANT: This does NOT check operation-specific permissions (e.g. WITHDRAW).
    Call check_account_permission() separately for that.
    """
    try:
        account = Account.objects.select_related("owner").get(pk=account_id)
    except Account.DoesNotExist:
        raise AccountNotFoundError(f"Account {account_id} not found.")

    # Owner always has visibility.
    if account.owner_id == user.pk:
        return account

    # Any explicit grant (even VIEW-only) implies visibility.
    has_any_grant = AccountAccess.objects.filter(
        account=account, user=user
    ).exists()
    if has_any_grant:
        return account

    # Neither owner nor grantee — the account's existence is not revealed.
    raise AccountNotFoundError(f"Account {account_id} not found.")


def check_account_permission(
    account: Account,
    user: User,
    permission: str,
) -> None:
    """
    Verify that `user` may perform `permission` on `account`.

    `permission` must be one of AccountAccess.Permission values:
        VIEW, DEPOSIT, WITHDRAW, TRANSFER

    Raises:
        AccountInactiveError   — if the account is closed.
        AuthorizationError     — if the user lacks the required permission.
    """
    if not account.is_active:
        raise AccountInactiveError()

    # AUDITOR can never move money.
    if user.is_auditor and permission != AccountAccess.Permission.VIEW:
        raise AuthorizationError(
            "Auditors have read-only access and cannot perform financial operations."
        )

    # Owner has full implicit access — no grant record needed.
    if account.owner_id == user.pk:
        return

    # Check explicit grant.
    has_grant = AccountAccess.objects.filter(
        account=account,
        user=user,
        permission=permission,
    ).exists()
    if not has_grant:
        raise AuthorizationError(
            f"You do not have {permission} permission on account "
            f"{account.account_number}."
        )


def check_deposit_authorization(account: Account, user: User) -> None:
    check_account_permission(account, user, AccountAccess.Permission.DEPOSIT)


def check_withdrawal_authorization(account: Account, user: User) -> None:
    check_account_permission(account, user, AccountAccess.Permission.WITHDRAW)


def check_transfer_authorization(account: Account, user: User) -> None:
    check_account_permission(account, user, AccountAccess.Permission.TRANSFER)
