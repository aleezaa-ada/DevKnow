from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Validates password confirmation and creates new user.
    """
    username = serializers.CharField(required=True, min_length=1)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    password2 = serializers.CharField(write_only=True, label='Confirm password', required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2']

    def validate_username(self, value):
        """Ensure username is unique and not empty."""
        if not value:
            raise serializers.ValidationError("Username cannot be empty.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, data):
        """Validate that passwords match."""
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


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
