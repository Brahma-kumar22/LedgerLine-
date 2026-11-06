"""
transactions/views.py

POST /api/transactions/deposit/
POST /api/transactions/withdraw/
POST /api/transactions/transfer/
GET  /api/transactions/
GET  /api/transactions/{id}/

Views are deliberately thin: validate → call service → map exceptions → respond.
All financial logic lives in transactions/services/.
"""

import uuid as uuid_module
from decimal import Decimal

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Transaction
from .serializers import (
    DepositRequestSerializer,
    TransactionSerializer,
    TransferRequestSerializer,
    WithdrawalRequestSerializer,
)
from .services import (
    AccountInactiveError,
    AccountNotFoundError,
    AuthorizationError,
    FinancialError,
    IdempotencyConflictError,
    IdempotencyMismatchError,
    InsufficientFundsError,
    InvalidAmountError,
    SameAccountTransferError,
    deposit,
    transfer,
    withdraw,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_idempotency_key(request) -> str | None:
    """Extract Idempotency-Key header (case-insensitive)."""
    return request.META.get("HTTP_IDEMPOTENCY_KEY") or request.data.get("idempotency_key")


def _get_ip(request) -> str | None:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _error(msg: str, http_status: int) -> Response:
    return Response({"error": msg}, status=http_status)


def _handle_service_exception(exc: Exception) -> Response:
    """Map service-layer exceptions to HTTP responses. No stack traces exposed."""
    if isinstance(exc, IdempotencyConflictError):
        return _error(exc.message, status.HTTP_409_CONFLICT)
    if isinstance(exc, IdempotencyMismatchError):
        return _error(exc.message, status.HTTP_422_UNPROCESSABLE_ENTITY)
    if isinstance(exc, (AuthorizationError,)):
        return _error(exc.message, status.HTTP_403_FORBIDDEN)
    if isinstance(exc, (AccountNotFoundError,)):
        return _error(exc.message, status.HTTP_404_NOT_FOUND)
    if isinstance(exc, (AccountInactiveError, InsufficientFundsError,
                        SameAccountTransferError, InvalidAmountError)):
        return _error(exc.message, status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, FinancialError):
        return _error(exc.message, status.HTTP_400_BAD_REQUEST)
    # Unexpected — do not leak internals.
    return _error("An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Money-moving endpoints
# ---------------------------------------------------------------------------

class DepositView(APIView):
    """POST /api/transactions/deposit/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        idem_key = _get_idempotency_key(request)
        if not idem_key:
            return _error(
                "Idempotency-Key header is required for financial operations.",
                status.HTTP_400_BAD_REQUEST,
            )

        serializer = DepositRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vd = serializer.validated_data
        try:
            txn = deposit(
                user=request.user,
                account_id=str(vd["account_id"]),
                amount=vd["amount"],
                currency=vd.get("currency", "USD"),
                idempotency_key=str(idem_key),
                ip_address=_get_ip(request),
            )
        except Exception as exc:
            return _handle_service_exception(exc)

        return Response(TransactionSerializer(txn).data, status=status.HTTP_201_CREATED)


class WithdrawView(APIView):
    """POST /api/transactions/withdraw/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        idem_key = _get_idempotency_key(request)
        if not idem_key:
            return _error(
                "Idempotency-Key header is required for financial operations.",
                status.HTTP_400_BAD_REQUEST,
            )

        serializer = WithdrawalRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vd = serializer.validated_data
        try:
            txn = withdraw(
                user=request.user,
                account_id=str(vd["account_id"]),
                amount=vd["amount"],
                currency=vd.get("currency", "USD"),
                idempotency_key=str(idem_key),
                ip_address=_get_ip(request),
            )
        except Exception as exc:
            return _handle_service_exception(exc)

        return Response(TransactionSerializer(txn).data, status=status.HTTP_201_CREATED)


class TransferView(APIView):
    """POST /api/transactions/transfer/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        idem_key = _get_idempotency_key(request)
        if not idem_key:
            return _error(
                "Idempotency-Key header is required for financial operations.",
                status.HTTP_400_BAD_REQUEST,
            )

        serializer = TransferRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vd = serializer.validated_data
        try:
            txn = transfer(
                user=request.user,
                source_account_id=str(vd["source_account_id"]),
                destination_account_id=str(vd["destination_account_id"]),
                amount=vd["amount"],
                currency=vd.get("currency", "USD"),
                idempotency_key=str(idem_key),
                ip_address=_get_ip(request),
            )
        except Exception as exc:
            return _handle_service_exception(exc)

        return Response(TransactionSerializer(txn).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Read endpoints
# ---------------------------------------------------------------------------

class TransactionListView(generics.ListAPIView):
    """GET /api/transactions/ — list transactions visible to the caller."""
    serializer_class   = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin or user.is_auditor:
            return Transaction.objects.select_related(
                "initiated_by", "source_account", "destination_account"
            ).all()
        return Transaction.objects.select_related(
            "initiated_by", "source_account", "destination_account"
        ).filter(initiated_by=user)


class TransactionDetailView(generics.RetrieveAPIView):
    """GET /api/transactions/{id}/ — retrieve one transaction."""
    serializer_class   = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin or user.is_auditor:
            return Transaction.objects.all()
        return Transaction.objects.filter(initiated_by=user)
