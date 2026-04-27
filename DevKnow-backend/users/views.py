from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account.
    
    POST /api/auth/register/
    Returns: 201 Created with user data on success
    Errors:
    - 400 Bad Request: Invalid data, duplicate username/email, password mismatch
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'message': 'User created successfully',
                'user': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )


class MeView(generics.RetrieveAPIView):
    """
    Get current authenticated user's profile.
    
    GET /api/auth/me/
    Returns: 200 OK with user data
    Errors:
    - 401 Unauthorized: Missing or invalid token
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
