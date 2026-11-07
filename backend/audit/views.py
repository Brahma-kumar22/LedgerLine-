"""
audit/views.py

Read-only DRF views for the audit log.

PERMISSIONS:
    - Only ADMIN and AUDITOR roles may access audit records.
    - All operations are read-only — no create, update, or delete.

FILTERING:
    - ?event_type=TRANSACTION_COMPLETED
    - ?actor=<uuid>
    - ?resource_type=Transaction
    - ?created_at_after=2026-01-01
    - ?created_at_before=2026-12-31
"""

from rest_framework import generics, permissions

from users.permissions import IsAdminOrAuditor

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """GET /api/audit/ — paginated, filterable audit log."""
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAdminOrAuditor]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor").all()

        # Filter by event_type
        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        # Filter by actor (user UUID)
        actor = self.request.query_params.get("actor")
        if actor:
            qs = qs.filter(actor_id=actor)

        # Filter by resource_type
        resource_type = self.request.query_params.get("resource_type")
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        # Filter by date range
        created_after = self.request.query_params.get("created_at_after")
        if created_after:
            qs = qs.filter(created_at__gte=created_after)

        created_before = self.request.query_params.get("created_at_before")
        if created_before:
            qs = qs.filter(created_at__lte=created_before)

        return qs


class AuditLogDetailView(generics.RetrieveAPIView):
    """GET /api/audit/{id}/ — single audit record."""
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAdminOrAuditor]
    queryset           = AuditLog.objects.select_related("actor").all()
    lookup_field       = "pk"
    lookup_url_kwarg   = "pk"
