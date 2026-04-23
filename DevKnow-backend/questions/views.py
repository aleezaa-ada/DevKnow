from rest_framework import viewsets, permissions, generics
from django.contrib.auth import get_user_model
from .models import Question, Tag, AIResponse, ApprovedAnswer
from .serializers import (
    QuestionListSerializer,
    QuestionDetailSerializer,
    QuestionCreateSerializer,
    TagSerializer,
    AIResponseSerializer,
    ApprovedAnswerSerializer,
)

User = get_user_model()


class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Question CRUD operations.
    
    - GET /api/questions/: List all questions
    - POST /api/questions/: Create a new question (authenticated only)
    - GET /api/questions/{id}/: Retrieve a specific question
    - PUT /api/questions/{id}/: Update a question (owner only)
    - DELETE /api/questions/{id}/: Delete a question (owner only)
    """
    queryset = Question.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return QuestionCreateSerializer
        elif self.action == 'list':
            return QuestionListSerializer
        else:
            return QuestionDetailSerializer

    def perform_create(self, serializer):
        """Set author to current user on create."""
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        """Only allow update if user is the author."""
        if serializer.instance.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own questions.')
        serializer.save()

    def perform_destroy(self, instance):
        """Only allow delete if user is the author."""
        if instance.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete your own questions.')
        instance.delete()


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Tag retrieval (read-only).
    
    - GET /api/tags/: List all tags
    - GET /api/tags/{id}/: Retrieve a specific tag
    """
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]


class AIResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for AIResponse management.
    - GET/POST/PUT/DELETE for staff users only
    """
    queryset = AIResponse.objects.all()
    serializer_class = AIResponseSerializer
    permission_classes = [permissions.IsAdminUser]


class ApprovedAnswerViewSet(viewsets.ViewSet):
    """
    ViewSet for ApprovedAnswer management.
    - Retrieve by question_id
    - Create/update by senior users only
    """
    permission_classes = [permissions.AllowAny]

    def list(self, request):
        """Not implemented for approved answers."""
        from rest_framework.response import Response
        return Response(status=404)

