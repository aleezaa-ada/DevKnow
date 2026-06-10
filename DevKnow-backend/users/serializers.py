import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import ApprovedSeniorEmail

User = get_user_model()

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30
USERNAME_REGEX = re.compile(r'^[A-Za-z0-9_.-]+$')


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Validates username/email/password policy and creates a standard user.
    """
    username = serializers.CharField(
        required=True,
        min_length=USERNAME_MIN_LENGTH,
        max_length=USERNAME_MAX_LENGTH,
        trim_whitespace=True,
    )
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    password2 = serializers.CharField(write_only=True, label='Confirm password', required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'role']
        read_only_fields = ['role']

    def validate_username(self, value):
        """Validate username format and uniqueness."""
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Username cannot be empty.")
        if len(username) < USERNAME_MIN_LENGTH:
            raise serializers.ValidationError(
                f"Username must be at least {USERNAME_MIN_LENGTH} characters."
            )
        if len(username) > USERNAME_MAX_LENGTH:
            raise serializers.ValidationError(
                f"Username must be at most {USERNAME_MAX_LENGTH} characters."
            )
        if not USERNAME_REGEX.fullmatch(username):
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, dots, underscores, and hyphens."
            )
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return username

    def validate_email(self, value):
        """Normalize and ensure email is unique."""
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, data):
        """Validate password confirmation and password strength."""
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match'})

        candidate_user = User(
            username=data.get('username', ''),
            email=data.get('email', ''),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
        )
        validate_password(data['password'], user=candidate_user)
        return data

    def create(self, validated_data):
        """Auto-assign senior role if email is pre-approved, otherwise standard."""
        validated_data.pop('password2')
        email = validated_data.get('email', '')
        is_approved_senior = ApprovedSeniorEmail.objects.filter(
            email__iexact=email
        ).exists()
        validated_data['role'] = 'senior' if is_approved_senior else 'standard'
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Input sanitizer for login credentials before JWT validation."""

    username = serializers.CharField(required=True, trim_whitespace=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError('Username is required.')
        return username


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile (read-only sensitive fields).
    """
    is_senior = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_senior']
        read_only_fields = ['id', 'role']

    def get_is_senior(self, obj):
        return obj.is_senior()
