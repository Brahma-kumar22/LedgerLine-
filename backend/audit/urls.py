"""
audit/urls.py

URL patterns for the audit API.
Included by config/urls.py under the prefix /api/audit/.
"""

from django.urls import path

from .views import AuditLogListView, AuditLogDetailView

urlpatterns = [
    path("",            AuditLogListView.as_view(),   name="audit-list"),
    path("<uuid:pk>/",  AuditLogDetailView.as_view(), name="audit-detail"),
]
