"""
accounts/serializers.py
"""
import uuid
from decimal import Decimal

from rest_framework import serializers

from .models import Account, AccountAccess


class AccountSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model  = Account
        fields = (
            "id", "account_number", "owner", "owner_username",
            "account_type", "name", "currency", "balance",
            "is_active", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "account_number", "owner", "owner_username",
            "balance", "created_at", "updated_at",
        )


class AccountCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Account
        fields = ("account_type", "name", "currency")

    def create(self, validated_data):
        user = self.context["request"].user
        return Account.objects.create(owner=user, **validated_data)


class AccountBalanceSerializer(serializers.Serializer):
    account_id     = serializers.UUIDField()
    account_number = serializers.CharField()
    currency       = serializers.CharField()
    balance        = serializers.DecimalField(max_digits=19, decimal_places=2)
    is_active      = serializers.BooleanField()


class AccountAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AccountAccess
        fields = ("id", "account", "user", "permission", "granted_by", "granted_at")
        read_only_fields = ("id", "granted_by", "granted_at")
