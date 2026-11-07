"""
transactions/reconciliation_views.py

API endpoint for running ledger reconciliation.

GET /api/reconciliation/
    Runs the reconciliation service and returns the report.
    Does NOT modify any data.

Permissions: ADMIN and AUDITOR only.
"""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdminOrAuditor
from .services.reconciliation_service import run_reconciliation


class ReconciliationView(APIView):
    """
    GET /api/reconciliation/

    Runs reconciliation and returns a JSON report containing:
        - balance_discrepancies: list of accounts where cached != ledger-derived
        - double_entry_violations: transactions where debit != credit
        - orphan_transactions: completed transactions with no ledger entries
        - has_discrepancies: boolean

    The endpoint is read-only. It never modifies balances or ledger entries.
    """
    permission_classes = [IsAdminOrAuditor]

    def get(self, request):
        report = run_reconciliation()

        # Serialize the dataclass fields to JSON-safe dicts
        return Response({
            "has_discrepancies": report.has_discrepancies,
            "balance_discrepancies": [
                {
                    "account_id":     d["account_id"],
                    "account_number":  d["account_number"],
                    "cached_balance":  str(d["cached_balance"]),
                    "ledger_balance":  str(d["ledger_balance"]),
                    "delta":           str(d["delta"]),
                }
                for d in report.balance_discrepancies
            ],
            "double_entry_violations": [
                {
                    "transaction_id": v["transaction_id"],
                    "reference":      v["reference"],
                    "debit_total":     str(v["debit_total"]),
                    "credit_total":    str(v["credit_total"]),
                }
                for v in report.double_entry_violations
            ],
            "orphan_transactions": report.orphan_transactions,
        }, status=status.HTTP_200_OK)
