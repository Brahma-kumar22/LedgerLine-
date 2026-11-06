from django.urls import path
from .views import (
    DepositView,
    WithdrawView,
    TransferView,
    TransactionListView,
    TransactionDetailView,
)

urlpatterns = [
    path("deposit/",          DepositView.as_view(),          name="deposit"),
    path("withdraw/",         WithdrawView.as_view(),         name="withdraw"),
    path("transfer/",         TransferView.as_view(),         name="transfer"),
    path("",                  TransactionListView.as_view(),  name="transaction-list"),
    path("<uuid:pk>/",        TransactionDetailView.as_view(),name="transaction-detail"),
]
