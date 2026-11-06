"""
users/views.py

API views for user management in MONVEX.

Endpoints provided here:
    POST /api/auth/register/   - Public registration (ACCOUNT_HOLDER only).
    GET  /api/users/me/        - Retrieve the authenticated user's own profile.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import User
from .serializers import PublicRegistrationSerializer, UserProfileSerializer


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/

    Public endpoint — no authentication required.

    Accepts: username, email, password, first_name, last_name.
    Always creates an ACCOUNT_HOLDER.  Role cannot be supplied by the caller.
    """

    queryset = User.objects.all()
    serializer_class = PublicRegistrationSerializer
    permission_classes = [permissions.AllowAny]  # Public — no token required.


class MeView(generics.RetrieveAPIView):
    """
    GET /api/users/me/

    Returns the profile of the currently authenticated user.
    Requires a valid JWT access token in the Authorization header.

    Uses RetrieveAPIView (a GenericAPIView subclass) so that drf-spectacular
    can introspect the serializer_class and generate accurate API schema docs.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self) -> User:
        """Return the currently authenticated user as the object to serialize."""
        return self.request.user
