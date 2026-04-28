from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AIResponseViewSet,
    PendingReviewListView,
    QuestionViewSet,
    ReviewAnswerView,
    TagViewSet,
)

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'ai-responses', AIResponseViewSet, basename='ai-response')

urlpatterns = [
    path('', include(router.urls)),
    path('questions/review/', PendingReviewListView.as_view(), name='pending-review'),
    path('questions/<int:pk>/review/', ReviewAnswerView.as_view(), name='review-answer'),
]
