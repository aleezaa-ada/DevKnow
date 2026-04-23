from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, TagViewSet, AIResponseViewSet

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'ai-responses', AIResponseViewSet, basename='ai-response')

urlpatterns = [
    path('', include(router.urls)),
]
