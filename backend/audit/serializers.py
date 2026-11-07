"""
audit/serializers.py

Read-only serializer for AuditLog records.
"""

from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializes AuditLog for the audit API. All fields read-only."""

    actor_username = serializers.CharField(
        source="actor.username", read_only=True, default="system"
    )

    class Meta:
        model = AuditLog
        fields = (
            "id", "actor", "actor_username", "event_type",
            "resource_type", "resource_id", "metadata",
            "ip_address", "created_at",
        )
        read_only_fields = fields
