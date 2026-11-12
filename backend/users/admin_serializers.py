"""
users/admin_serializers.py

Serializers for the admin user management API.

PERMISSION MODEL:
    - ADMIN can create/view/update/deactivate all three roles.
    - AUDITOR can create/view ACCOUNT_HOLDER and AUDITOR only.
    - ACCOUNT_HOLDER has no access to these serializers.
"""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class AdminUserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the user list view."""
    full_name     = serializers.SerializerMethodField()
    account_count = serializers.IntegerField(read_only=True)

    class Meta:
        model  = User
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
        model  = User
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


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new user via the admin API.

    SECURITY:
        - `password` is write-only and run through Django's password validators.
        - The `role` field is validated against what the requesting user is
          permitted to assign — this check happens in the view, not the serializer,
          because the serializer does not have access to request.user.
        - Passwords are NEVER returned in any response.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
        help_text="Plain-text password. Hashed server-side. Never returned.",
    )

    class Meta:
        model  = User
        fields = (
            "username", "email", "password",
            "first_name", "last_name", "role", "is_active",
        )
        extra_kwargs = {
            "email":      {"required": True},
            "first_name": {"required": False},
            "last_name":  {"required": False},
            "is_active":  {"required": False, "default": True},
        }

    def validate_role(self, value):
        """
        Validate that `value` is a known role.
        Role permission enforcement (e.g. AUDITOR cannot assign ADMIN)
        is handled in AdminUserCreateView using the requesting user's role.
        """
        valid_roles = [r[0] for r in User.Role.choices]
        if value not in valid_roles:
            raise serializers.ValidationError(
                f"'{value}' is not a valid role. Must be one of: {valid_roles}"
            )
        return value

    def create(self, validated_data):
        """Create the user using `create_user` so the password is hashed."""
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for partial updates — role changes and activation/deactivation.

    Only ADMIN may call this. The view enforces that constraint.
    Password resets are not supported through this endpoint (use the
    Django admin panel or a dedicated password-reset flow).
    """

    class Meta:
        model  = User
        fields = ("role", "is_active", "first_name", "last_name")

    def validate_role(self, value):
        valid_roles = [r[0] for r in User.Role.choices]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role: {value}")
        return value
