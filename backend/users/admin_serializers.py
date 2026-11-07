"""
users/admin_serializers.py

Serializers for the admin user management API.
Only ADMIN role users may access these endpoints.
"""

from rest_framework import serializers

from .models import User


class AdminUserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the user list view."""
    full_name = serializers.SerializerMethodField()
    account_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "full_name",
            "role", "is_active", "is_staff",
            "date_joined", "account_count",
        )
        read_only_fields = fields

    def get_full_name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return ""


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for the user detail view."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "full_name",
            "role", "is_active", "is_staff", "is_superuser",
            "date_joined", "last_login", "updated_at",
        )
        read_only_fields = fields

    def get_full_name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return ""
