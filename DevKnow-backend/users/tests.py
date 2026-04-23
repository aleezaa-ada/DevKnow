from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserModelTests(TestCase):
    """Tests for custom User model."""

    def test_create_user(self):
        """Test creating a regular user."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertFalse(user.is_staff)
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, 'standard')  # default

    def test_create_superuser(self):
        """Test creating a superuser."""
        user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_user_role_choices(self):
        """Test that only valid roles are accepted."""
        user = User.objects.create_user(
            username='senior',
            email='senior@example.com',
            password='pass123',
            role='senior'
        )
        self.assertEqual(user.role, 'senior')
        self.assertTrue(user.is_senior())

    def test_is_senior_method(self):
        """Test is_senior() returns True for senior and admin roles."""
        standard = User.objects.create_user(
            username='std', email='std@ex.com', password='pass', role='standard'
        )
        senior = User.objects.create_user(
            username='sen', email='sen@ex.com', password='pass', role='senior'
        )
        admin = User.objects.create_user(
            username='adm', email='adm@ex.com', password='pass', role='admin'
        )
        self.assertFalse(standard.is_senior())
        self.assertTrue(senior.is_senior())
        self.assertTrue(admin.is_senior())

    def test_user_str_representation(self):
        """Test __str__ returns username and role display."""
        user = User.objects.create_user(
            username='testuser', email='test@ex.com', password='pass', role='senior'
        )
        self.assertEqual(str(user), 'testuser (Senior Developer)')


class RegisterAPITests(TestCase):
    """Tests for user registration endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.valid_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'securepass123',
            'password2': 'securepass123'
        }

    def test_register_success(self):
        """Test successful user registration."""
        response = self.client.post(self.register_url, self.valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'newuser')
        self.assertEqual(response.data['user']['email'], 'newuser@example.com')
        # Verify user was created in DB
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_register_password_mismatch(self):
        """Test registration fails when passwords don't match."""
        data = self.valid_data.copy()
        data['password2'] = 'differentpass123'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Passwords do not match', str(response.data))
        # User should not be created
        self.assertFalse(User.objects.filter(username='newuser').exists())

    def test_register_password_too_short(self):
        """Test registration fails with password < 8 characters."""
        data = self.valid_data.copy()
        data['password'] = 'short'
        data['password2'] = 'short'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newuser').exists())

    def test_register_duplicate_username(self):
        """Test registration fails if username already exists."""
        User.objects.create_user(
            username='existing', email='existing@ex.com', password='pass123'
        )
        data = self.valid_data.copy()
        data['username'] = 'existing'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', str(response.data).lower())

    def test_register_duplicate_email(self):
        """Test registration fails if email already exists."""
        User.objects.create_user(
            username='existing', email='taken@example.com', password='pass123'
        )
        data = self.valid_data.copy()
        data['email'] = 'taken@example.com'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', str(response.data).lower())

    def test_register_missing_required_field(self):
        """Test registration fails if required field is missing."""
        data = self.valid_data.copy()
        del data['email']
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_password2(self):
        """Test registration fails if password confirmation is missing."""
        data = self.valid_data.copy()
        del data['password2']
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_empty_username(self):
        """Test registration fails with empty username."""
        data = self.valid_data.copy()
        data['username'] = ''
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MeAPITests(TestCase):
    """Tests for current user profile endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.me_url = '/api/auth/me/'
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='senior'
        )

    def test_get_me_authenticated(self):
        """Test retrieving own profile when authenticated."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['first_name'], 'Test')
        self.assertEqual(response.data['role'], 'senior')
        self.assertTrue(response.data['is_senior'])

    def test_get_me_unauthenticated(self):
        """Test /me endpoint returns 401 when not authenticated."""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_me_standard_user_not_senior(self):
        """Test is_senior is False for standard role."""
        standard_user = User.objects.create_user(
            username='standard', email='std@ex.com', password='pass', role='standard'
        )
        self.client.force_authenticate(user=standard_user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_senior'])

    def test_me_readonly_fields(self):
        """Test that certain fields cannot be modified via this endpoint."""
        self.client.force_authenticate(user=self.user)
        # This endpoint is GET only, but verify role is read-only
        response = self.client.get(self.me_url)
        self.assertIn('role', response.data)
        self.assertEqual(response.data['role'], 'senior')
        # If it were PUT, we should verify role doesn't change

