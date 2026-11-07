"""
users/admin_urls.py

URL patterns for the admin user management API.
Included by config/urls.py under the prefix /api/admin/users/.
"""

from django.urls import path

from .admin_views import AdminUserListView, AdminUserDetailView

urlpatterns = [
    path("",           AdminUserListView.as_view(),   name="admin-user-list"),
    path("<uuid:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
