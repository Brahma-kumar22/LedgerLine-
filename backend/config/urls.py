"""config/urls.py — MONVEX root URL configuration."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/token/",         TokenObtainPairView.as_view(),  name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(),     name="token_refresh"),

    # Users
    path("api/", include("users.urls")),

    # Accounts
    path("api/accounts/", include("accounts.urls")),

    # Transactions (deposit / withdraw / transfer / list / detail)
    path("api/transactions/", include("transactions.urls")),

    # API docs
    path("api/schema/", SpectacularAPIView.as_view(),                       name="schema"),
    path("api/docs/",   SpectacularSwaggerView.as_view(url_name="schema"),  name="swagger-ui"),
    path("api/redoc/",  SpectacularRedocView.as_view(url_name="schema"),    name="redoc"),
]
