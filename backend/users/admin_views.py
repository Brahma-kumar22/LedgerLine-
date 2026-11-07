"""
users/admin_views.py

Admin-only DRF views for user management.

PERMISSIONS:
    - Only ADMIN role users may access these endpoints.
    - All operations are read-only in this phase.
    - Role changes are not supported via this API yet.

FILTERING:
    - ?search=<string> — searches username and email
    - ?role=ACCOUNT_HOLDER
    - ?is_active=true
"""

from django.db.models import Count, Q
from rest_framework import generics

from accounts.models import Account
from users.permissions import IsAdmin

from .models import User
from .admin_serializers import AdminUserListSerializer, AdminUserDetailSerializer


class AdminUserListView(generics.ListAPIView):
    """GET /api/admin/users/ — paginated, searchable user list."""
    serializer_class   = AdminUserListSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = (
            User.objects
            .annotate(account_count=Count("accounts", distinct=True))
            .all()
        )

        # Search by username or email
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )

        # Filter by role
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        # Filter by is_active
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            if is_active.lower() in ("true", "1"):
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ("false", "0"):
                qs = qs.filter(is_active=False)

        return qs.order_by("username")


class AdminUserDetailView(generics.RetrieveAPIView):
    """GET /api/admin/users/{id}/ — user detail view."""
    serializer_class   = AdminUserDetailSerializer
    permission_classes = [IsAdmin]
    queryset           = User.objects.all()
    lookup_field       = "pk"
    lookup_url_kwarg   = "pk"
