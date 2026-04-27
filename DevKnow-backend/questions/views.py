from rest_framework import viewsets, permissions, generics
from django.contrib.auth import get_user_model
from .models import Question, Tag, AIResponse, ApprovedAnswer
import os
import logging
from .ai_service import generate_ai_response
from .serializers import (
    QuestionListSerializer,
    QuestionDetailSerializer,
    QuestionCreateSerializer,
    TagSerializer,
    AIResponseSerializer,
    ApprovedAnswerSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


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

    def get_queryset(self):
        qs = Question.objects.select_related('author').prefetch_related('tags')
        status_filter = self.request.query_params.get('status')
        tag_filter = self.request.query_params.get('tag')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if tag_filter:
            qs = qs.filter(tags__name=tag_filter)
        return qs

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return QuestionCreateSerializer
        elif self.action == 'list':
            return QuestionListSerializer
        else:
            return QuestionDetailSerializer

    def perform_create(self, serializer):
        tag_names = self.request.data.get('tag_names', [])
        question = serializer.save()
 
        # Handle tags
        for name in tag_names:
            clean_name = str(name).lower().strip()
            if not clean_name:
                continue
            tag, _ = Tag.objects.get_or_create(name=clean_name)
            question.tags.add(tag)
            tag.usage_count += 1
            tag.save()
 
        # Trigger AI generation — wrap in try/except so question saves
        # even if the AI is unavailable
        try:
            ai_text = generate_ai_response(question.title, question.description)
            AIResponse.objects.create(
                question=question,
                content=ai_text,
                model_used=os.getenv('DELOITTE_MODEL', 'gpt-4o'),
                approval_status=AIResponse.STATUS_PENDING,
            )
            question.status = Question.STATUS_PENDING
            question.save()
        except Exception:
            # AI failed — question stays open.
            logger.exception(
                'AI generation failed for question creation',
                extra={
                    'question_id': question.id,
                    'author_id': question.author_id,
                },
            )

        
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
