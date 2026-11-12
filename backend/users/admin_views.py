"""
users/admin_views.py

User management API views.

PERMISSION MATRIX (enforced server-side):
    Action              | ADMIN | AUDITOR | ACCOUNT_HOLDER
    --------------------|-------|---------|---------------
    List users          |  Yes  |   Yes   |      No
    Get user detail     |  Yes  |   Yes   |      No
    Create ADMIN        |  Yes  |   No    |      No
    Create AUDITOR      |  Yes  |   Yes   |      No
    Create ACCT_HOLDER  |  Yes  |   Yes   |      No
    Update role/status  |  Yes  |   No    |      No
    Deactivate user     |  Yes  |   No    |      No

ROUTES:
    GET    /api/admin/users/       — list (ADMIN + AUDITOR)
    POST   /api/admin/users/       — create (ADMIN + AUDITOR, role restricted)
    GET    /api/admin/users/{id}/  — detail (ADMIN + AUDITOR)
    PATCH  /api/admin/users/{id}/  — update role/status (ADMIN only)
"""

from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.response import Response

from users.permissions import IsAdmin, IsAdminOrAuditor

from .models import User
from .admin_serializers import (
    AdminUserListSerializer,
    AdminUserCreateSerializer,
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
)


# ── Roles that AUDITOR is permitted to create ─────────────────────────────────
AUDITOR_CREATABLE_ROLES = {User.Role.ACCOUNT_HOLDER, User.Role.AUDITOR}


class AdminUserListCreateView(generics.GenericAPIView):
    """
    GET  /api/admin/users/ — paginated, searchable user list (ADMIN + AUDITOR).
    POST /api/admin/users/ — create a new user (ADMIN + AUDITOR, role restricted).
    """

    permission_classes = [IsAdminOrAuditor]

    def get_queryset(self):
        qs = (
            User.objects
            .annotate(account_count=Count("accounts", distinct=True))
        )

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )

        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            if is_active.lower() in ("true", "1"):
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ("false", "0"):
                qs = qs.filter(is_active=False)

        return qs.order_by("username")

    def get(self, request):
        """List users with optional search, role filter and pagination."""
        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        paginator.page_size = 20

        qs = self.get_queryset()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminUserListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        """
        Create a new user.

        AUDITOR can only create ACCOUNT_HOLDER and AUDITOR accounts.
        AUDITOR cannot create ADMIN accounts.
        ADMIN can create any role.
        """
        serializer = AdminUserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        requested_role = serializer.validated_data.get("role", User.Role.ACCOUNT_HOLDER)

        # Role restriction for AUDITOR creators
        if request.user.is_auditor and requested_role not in AUDITOR_CREATABLE_ROLES:
            return Response(
                {
                    "error": (
                        f"AUDITOR cannot create users with role '{requested_role}'. "
                        f"Allowed roles: {[r.value for r in AUDITOR_CREATABLE_ROLES]}"
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user = serializer.save()

        # Write audit log
        try:
            from audit.models import AuditLog
            AuditLog.objects.create(
                actor=request.user,
                event_type=AuditLog.EventType.ADMIN_ACTION,
                resource_type="User",
                resource_id=str(user.id),
                metadata={
                    "action":   "create_user",
                    "username": user.username,
                    "role":     user.role,
                    "created_by_role": request.user.role,
                },
            )
        except Exception:
            pass  # Audit failure must never block user creation

        return Response(
            AdminUserDetailSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class AdminUserDetailUpdateView(generics.GenericAPIView):
    """
    GET   /api/admin/users/{id}/ — detail (ADMIN + AUDITOR).
    PATCH /api/admin/users/{id}/ — update role/active status (ADMIN only).
    """

    permission_classes = [IsAdminOrAuditor]

    def get_object(self):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(User, pk=self.kwargs["pk"])

    def get(self, request, pk):
        """Return full user detail."""
        user = self.get_object()
        serializer = AdminUserDetailSerializer(user)
        return Response(serializer.data)

    def patch(self, request, pk):
        """
        Partial update — change role or active status.
        ADMIN only. AUDITOR cannot modify users.
        """
        if not request.user.is_admin:
            return Response(
                {"error": "Only ADMIN users can modify user records."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = self.get_object()
        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        old_role      = user.role
        old_is_active = user.is_active
        updated_user  = serializer.save()

        # Write audit log for role or status changes
        try:
            from audit.models import AuditLog
            metadata = {"action": "update_user", "username": updated_user.username}
            if old_role != updated_user.role:
                metadata["role_changed"] = {"from": old_role, "to": updated_user.role}
            if old_is_active != updated_user.is_active:
                metadata["is_active_changed"] = {
                    "from": old_is_active, "to": updated_user.is_active
                }
            AuditLog.objects.create(
                actor=request.user,
                event_type=AuditLog.EventType.USER_ROLE_CHANGED,
                resource_type="User",
                resource_id=str(updated_user.id),
                metadata=metadata,
            )
        except Exception:
            pass

        return Response(AdminUserDetailSerializer(updated_user).data)
