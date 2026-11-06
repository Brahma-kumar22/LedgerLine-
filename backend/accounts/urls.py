from django.urls import path
from .views import (
    AccountListCreateView,
    AccountDetailView,
    AccountBalanceView,
    AccountStatementView,
)

urlpatterns = [
    path("",          AccountListCreateView.as_view(), name="account-list-create"),
    path("<uuid:pk>/",            AccountDetailView.as_view(),   name="account-detail"),
    path("<uuid:pk>/balance/",    AccountBalanceView.as_view(),  name="account-balance"),
    path("<uuid:pk>/statement/",  AccountStatementView.as_view(),name="account-statement"),
]
