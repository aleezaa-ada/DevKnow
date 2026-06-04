from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AIResponseViewSet,
    PendingReviewListView,
    QuestionViewSet,
    RetryAIView,
    ReviewAnswerView,
    SearchQuestionsView,
    TagViewSet,
    VoteView,
)

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'ai-responses', AIResponseViewSet, basename='ai-response')

urlpatterns = [
    path('questions/review/', PendingReviewListView.as_view(), name='pending-review'),
    path('questions/search/', SearchQuestionsView.as_view(), name='search'),
    path('questions/<int:pk>/review/', ReviewAnswerView.as_view(), name='review-answer'),
    path('questions/<int:pk>/retry-ai/', RetryAIView.as_view(), name='retry-ai'),
    path('questions/answers/<int:pk>/vote/', VoteView.as_view(), name='vote'),
    path('', include(router.urls)),
]
