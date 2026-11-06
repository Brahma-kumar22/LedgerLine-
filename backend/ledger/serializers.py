"""
ledger/serializers.py
"""
from rest_framework import serializers
from .models import LedgerEntry


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model  = LedgerEntry
        fields = (
            "id", "transaction", "account", "entry_type",
            "amount", "currency", "balance_after",
            "initiated_by", "created_at",
        )
        read_only_fields = fields
