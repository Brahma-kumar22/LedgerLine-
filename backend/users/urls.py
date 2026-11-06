"""
users/urls.py

URL patterns for the users application.

These are included by config/urls.py under the prefix /api/.
"""

from django.urls import path

from .views import MeView, RegisterView

urlpatterns = [
    # Public registration — creates ACCOUNT_HOLDER users only.
    path("auth/register/", RegisterView.as_view(), name="register"),

    # Authenticated user's own profile.
    path("users/me/", MeView.as_view(), name="me"),
]
