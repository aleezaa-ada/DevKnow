from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AIResponse, ApprovedAnswer, Question, Tag

User = get_user_model()


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model."""
    class Meta:
        model = Tag
        fields = ['id', 'name', 'usage_count']
        read_only_fields = ['id', 'usage_count']


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for questions (author, approver)."""
    class Meta:
        model = User
        fields = ['id', 'username', 'role']


class QuestionListSerializer(serializers.ModelSerializer):
    """Serializer for question list view."""
    author = UserMinimalSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'title', 'author', 'status', 'tags', 'created_at']
        read_only_fields = ['id', 'created_at', 'author']


class QuestionDetailSerializer(serializers.ModelSerializer):
    """Serializer for question detail view."""
    author = UserMinimalSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'title', 'description', 'author', 'status', 'tags', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'author']


class QuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questions."""
    title = serializers.CharField(required=True, min_length=5)
    description = serializers.CharField(required=True, min_length=10)
    tag_names = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False, default=list
    )

    class Meta:
        model = Question
        fields = ['id', 'title', 'description', 'status', 'tag_names']
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create question with current user as author. Tags handled in view."""
        validated_data.pop('tag_names', [])
        validated_data['author'] = self.context['request'].user
        return Question.objects.create(**validated_data)


class AIResponseSerializer(serializers.ModelSerializer):
    """Serializer for AI Response."""
    class Meta:
        model = AIResponse
        fields = ['id', 'question', 'content', 'model_used', 'approval_status', 'generated_at']
        read_only_fields = ['id', 'generated_at']


class ApprovedAnswerSerializer(serializers.ModelSerializer):
    """Serializer for Approved Answer."""
    approved_by = UserMinimalSerializer(read_only=True)
    ai_response = AIResponseSerializer(read_only=True)

    class Meta:
        model = ApprovedAnswer
        fields = ['id', 'question', 'ai_response', 'approved_by', 'final_content', 'approved_at']
        read_only_fields = ['id', 'approved_at']
