"""
accounts/views.py

GET  /api/accounts/                 list accounts owned by the caller
POST /api/accounts/                 create a new account
GET  /api/accounts/{id}/            retrieve one account
GET  /api/accounts/{id}/balance/    current balance only
GET  /api/accounts/{id}/statement/  paginated ledger entries for this account
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ledger.models import LedgerEntry

from .models import Account
from .serializers import (
    AccountBalanceSerializer,
    AccountCreateSerializer,
    AccountSerializer,
)
from transactions.serializers import LedgerEntrySerializer
from users.permissions import IsAdmin, IsAdminOrAuditor


class AccountListCreateView(generics.ListCreateAPIView):
    """
    GET  — list all accounts owned by the authenticated user.
    POST — create a new account for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AccountCreateSerializer
        return AccountSerializer

    def get_queryset(self):
        user = self.request.user
        # ADMIN / AUDITOR may list all accounts.
        if user.is_admin or user.is_auditor:
            return Account.objects.select_related("owner").all()
        return Account.objects.select_related("owner").filter(owner=user)

    def create(self, request, *args, **kwargs):
        # Only ACCOUNT_HOLDERs may create accounts via the API.
        if not request.user.is_account_holder:
            return Response(
                {"error": "Only account holders may create accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


class AccountDetailView(generics.RetrieveAPIView):
    """GET /api/accounts/{id}/ — retrieve one account."""
    serializer_class   = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin or user.is_auditor:
            return Account.objects.select_related("owner").all()
        return Account.objects.select_related("owner").filter(owner=user)


class AccountBalanceView(APIView):
    """GET /api/accounts/{id}/balance/ — returns current balance only."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        qs = Account.objects.all() if (user.is_admin or user.is_auditor) \
             else Account.objects.filter(owner=user)
        try:
            account = qs.get(pk=pk)
        except Account.DoesNotExist:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AccountBalanceSerializer({
            "account_id":     account.pk,
            "account_number": account.account_number,
            "currency":       account.currency,
            "balance":        account.balance,
            "is_active":      account.is_active,
        })
        return Response(serializer.data)


class AccountStatementView(generics.ListAPIView):
    """
    GET /api/accounts/{id}/statement/
    Paginated ledger entries for the account, newest first.
    """
    serializer_class   = LedgerEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = request_user = self.request.user
        pk   = self.kwargs["pk"]

        qs = Account.objects.all() if (user.is_admin or user.is_auditor) \
             else Account.objects.filter(owner=user)
        try:
            account = qs.get(pk=pk)
        except Account.DoesNotExist:
            return LedgerEntry.objects.none()

        return (
            LedgerEntry.objects
            .filter(account=account)
            .select_related("transaction", "initiated_by")
            .order_by("-created_at")
        )
