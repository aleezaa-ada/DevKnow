import logging
import os

from django.contrib.auth import get_user_model
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_service import generate_ai_response
from .models import AIResponse, ApprovedAnswer, Question, ReviewAction, Tag, Vote
from .models import ApprovedAnswer as ApprovedAnswerModel
from .permissions import IsSeniorOrAdmin
from .serializers import (
    AIResponseSerializer,
    QuestionCreateSerializer,
    QuestionDetailSerializer,
    QuestionListSerializer,
    ReviewActionSerializer,
    TagSerializer,
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
 
class PendingReviewListView(generics.ListAPIView):
    """Lists all questions awaiting senior review."""
    serializer_class   = QuestionDetailSerializer
    permission_classes = [IsSeniorOrAdmin]
 
    def get_queryset(self):
        return Question.objects.filter(
            status=Question.STATUS_PENDING
        ).select_related('ai_response')
 
 
class ReviewAnswerView(APIView):
    """Senior developer approves or rejects an AI response."""
    permission_classes = [IsSeniorOrAdmin]
 
    def post(self, request, pk):
        try:
            ai_response = AIResponse.objects.get(pk=pk)
        except AIResponse.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
 
        serializer = ReviewActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
        action         = serializer.validated_data['action']
        edited_content = serializer.validated_data.get('edited_content', '')
        notes          = serializer.validated_data.get('review_notes', '')

        # Fetch question directly to avoid stale ORM cache via ai_response.question
        question = Question.objects.get(pk=ai_response.question_id)
 
        # Save audit log — always, regardless of approve or reject
        ReviewAction.objects.create(
            ai_response    = ai_response,
            reviewer       = request.user,
            action         = action,
            edited_content = edited_content,
            review_notes   = notes,
        )
 
        if action in ['approved', 'edited']:
            final_content = edited_content if edited_content else ai_response.content
            ApprovedAnswer.objects.update_or_create(
                question = question,
                defaults = {
                    'ai_response':   ai_response,
                    'approved_by':   request.user,
                    'final_content': final_content,
                },
            )
            ai_response.approval_status = AIResponse.STATUS_APPROVED
            question.status             = Question.STATUS_ANSWERED
        else:
            ApprovedAnswer.objects.filter(question=question).delete()
            ai_response.approval_status = AIResponse.STATUS_REJECTED
            question.status             = Question.STATUS_OPEN
 
        ai_response.save()
        question.save()
        return Response({'status': 'ok', 'action': action})
 
class SearchQuestionsView(generics.ListAPIView):
    serializer_class   = QuestionListSerializer
    permission_classes = [permissions.IsAuthenticated]
 
    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        if not query:
            return Question.objects.none()
        search_query = SearchQuery(query)
        vector = (
            SearchVector('title', weight='A') +
            SearchVector('description', weight='B')
        )
        return (
            Question.objects
            .annotate(rank=SearchRank(vector, search_query))
            .filter(rank__gte=0.01)
            .order_by('-rank')
        )
 
 
class VoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
 
    def post(self, request, pk):
        try:
            answer = ApprovedAnswerModel.objects.get(pk=pk)
        except ApprovedAnswerModel.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
 
        if answer.question.author == request.user:
            return Response(
                {'error': 'You cannot vote on your own question'},
                status=status.HTTP_403_FORBIDDEN
            )
 
        value = request.data.get('value')
        if value not in [1, -1]:
            return Response(
                {'error': 'value must be 1 (upvote) or -1 (downvote)'},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        vote, created = Vote.objects.update_or_create(
            user=request.user, answer=answer,
            defaults={'value': value}
        )
        return Response({'voted': value, 'created': created})
