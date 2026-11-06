"""
transactions/serializers.py
"""
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from ledger.models import LedgerEntry

from .models import Transaction
from .idempotency import IdempotencyRecord
from .attempts import TransactionAttempt


# ---------------------------------------------------------------------------
# Money-moving request serializers
# ---------------------------------------------------------------------------

class DepositRequestSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    amount     = serializers.DecimalField(max_digits=19, decimal_places=2, min_value=Decimal("0.01"))
    currency   = serializers.CharField(max_length=3, default="USD")

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be positive.")
        return value


class WithdrawalRequestSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    amount     = serializers.DecimalField(max_digits=19, decimal_places=2, min_value=Decimal("0.01"))
    currency   = serializers.CharField(max_length=3, default="USD")

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be positive.")
        return value


class TransferRequestSerializer(serializers.Serializer):
    source_account_id      = serializers.UUIDField()
    destination_account_id = serializers.UUIDField()
    amount   = serializers.DecimalField(max_digits=19, decimal_places=2, min_value=Decimal("0.01"))
    currency = serializers.CharField(max_length=3, default="USD")

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate(self, data):
        if data["source_account_id"] == data["destination_account_id"]:
            raise serializers.ValidationError(
                "source_account_id and destination_account_id must be different."
            )
        return data


# ---------------------------------------------------------------------------
# Response serializers
# ---------------------------------------------------------------------------

class TransactionSerializer(serializers.ModelSerializer):
    initiated_by_username = serializers.CharField(
        source="initiated_by.username", read_only=True
    )

    class Meta:
        model  = Transaction
        fields = (
            "id", "reference", "transaction_type", "amount", "currency",
            "source_account", "destination_account",
            "initiated_by", "initiated_by_username",
            "status", "failure_reason",
            "created_at", "updated_at",
        )
        read_only_fields = fields


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model  = LedgerEntry
        fields = (
            "id", "transaction", "account", "entry_type",
            "amount", "currency", "balance_after",
            "initiated_by", "created_at",
        )
        read_only_fields = fields


class IdempotencyRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model  = IdempotencyRecord
        fields = (
            "id", "idempotency_key", "status",
            "transaction", "response_status_code", "created_at", "updated_at",
        )
        read_only_fields = fields


class TransactionAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TransactionAttempt
        fields = (
            "id", "transaction_type", "outcome", "amount", "currency",
            "failure_reason", "transaction", "created_at",
        )
        read_only_fields = fields
