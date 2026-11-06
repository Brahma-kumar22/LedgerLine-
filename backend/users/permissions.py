"""
users/permissions.py

DRF permission classes for MONVEX role-based access control.

Usage in a view:
    from users.permissions import IsAdmin, IsAuditor, IsAccountHolder, IsOwner

    class SomeView(generics.RetrieveAPIView):
        permission_classes = [IsAuthenticated, IsAdmin]

These classes check server-side role assignments.  They cannot be
bypassed by modifying frontend code or request headers.

IsOwner is an object-level permission — it must be used alongside
a view that calls self.get_object(), which invokes check_object_permissions().
"""

from rest_framework.permissions import BasePermission, IsAuthenticated  # noqa: F401


class IsAdmin(BasePermission):
    """
    Allow access only to users with the ADMIN role.

    Use this to protect administrator-only endpoints such as role management,
    system configuration, and privileged account operations.
    """

    message = "You do not have administrator privileges."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )


class IsAuditor(BasePermission):
    """
    Allow access only to users with the AUDITOR role.

    Use this to protect read-only audit trail and ledger endpoints
    that are restricted to compliance/audit personnel.
    """

    message = "You do not have auditor privileges."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_auditor
        )


class IsAccountHolder(BasePermission):
    """
    Allow access only to users with the ACCOUNT_HOLDER role.

    Use this for endpoints that are only relevant to account owners
    (e.g. creating a new account or initiating a transaction).
    """

    message = "This endpoint is available to account holders only."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_account_holder
        )


class IsAdminOrAuditor(BasePermission):
    """
    Allow access to ADMIN or AUDITOR roles.

    Use this for read-heavy reporting endpoints that both roles
    are permitted to access.
    """

    message = "You do not have the required privileges."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.is_admin or request.user.is_auditor)
        )


class IsOwner(BasePermission):
    """
    Object-level permission: allow access only when request.user owns
    the object being accessed.

    The object must have an 'owner' attribute that is a User instance.
    This is used to prevent user A from reading or modifying user B's
    accounts or transactions.

    Example usage:
        permission_classes = [IsAuthenticated, IsOwner]

    The view must call self.get_object() to trigger this check.
    """

    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj) -> bool:
        # The object must have an 'owner' attribute pointing to a User.
        return hasattr(obj, "owner") and obj.owner == request.user
