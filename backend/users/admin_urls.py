"""
users/admin_urls.py

URL patterns for the user management API.
Included by config/urls.py under the prefix /api/admin/users/.
"""

from django.urls import path

from .admin_views import AdminUserListCreateView, AdminUserDetailUpdateView

urlpatterns = [
    path("",           AdminUserListCreateView.as_view(),   name="admin-user-list-create"),
    path("<uuid:pk>/", AdminUserDetailUpdateView.as_view(), name="admin-user-detail-update"),
]
