"""
users/serializers.py

DRF serializers for the User model.

SECURITY:
    PublicRegistrationSerializer deliberately does NOT expose the 'role'
    field.  No matter what a client sends in the request body, the role
    is always forced to ACCOUNT_HOLDER inside create().  This means it is
    impossible for a public caller to register as ADMIN or AUDITOR.
"""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class PublicRegistrationSerializer(serializers.ModelSerializer):
    """
    Used by the public /api/auth/register/ endpoint.

    Accepts: username, email, password, first_name (optional), last_name (optional).
    Always creates an ACCOUNT_HOLDER — role is NOT an accepted input field.
    """

    # Write-only so the password is never returned in any response.
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],   # Enforces Django's password policy.
    )

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name")
        extra_kwargs = {
            "email":      {"required": True},
            "first_name": {"required": False},
            "last_name":  {"required": False},
        }

    def create(self, validated_data: dict) -> User:
        """
        Create a new user.

        Role is ALWAYS set to ACCOUNT_HOLDER here, regardless of anything
        in validated_data.  The role field is not even in the serializer
        fields list, but this explicit assignment is a second safety layer.
        """
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],    # create_user hashes this automatically.
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=User.Role.ACCOUNT_HOLDER,          # ENFORCED — never from user input.
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for returning user profile data.

    Returned after login or when fetching /api/users/me/.
    Never exposes the password or internal flags like is_superuser.
    """

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role", "date_joined")
        read_only_fields = fields
