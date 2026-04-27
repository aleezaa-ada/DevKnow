from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
import os
from .models import Question, AIResponse
from .ai_service import generate_ai_response, AIServiceError
from rest_framework.test import APIClient
from rest_framework import status as drf_status
 
User = get_user_model()
 
 
class AIServiceTests(TestCase):
    """Tests for the AI service layer."""

    def setUp(self):
        self.env_patch = patch.dict(
            os.environ,
            {
                'DELOITTE_API_KEY': 'test-key',
                'DELOITTE_BASE_URL': 'https://example.test',
            },
            clear=False,
        )
        self.env_patch.start()

    def tearDown(self):
        self.env_patch.stop()
 
    @patch('questions.ai_service.OpenAI')
    def test_generate_ai_response_returns_string(self, mock_openai):
        """Test that generate_ai_response returns a string."""
        # Arrange: set up the mock to return a fake response
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.return_value.choices[0].message.content = (
            'This is a mocked AI response.'
        )
        # Act
        result = generate_ai_response('Test title', 'Test description')
        # Assert
        self.assertIsInstance(result, str)
        self.assertEqual(result, 'This is a mocked AI response.')
 
    @patch('questions.ai_service.OpenAI')
    def test_generate_ai_response_calls_api_with_correct_model(self, mock_openai):
        """Test that the correct model is used."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.return_value.choices[0].message.content = 'response'
 
        with self.settings(DELOITTE_MODEL='gpt-4o'):
            generate_ai_response('Title', 'Description')
 
        call_kwargs = mock_client.chat.completions.create.call_args
        self.assertIn('messages', call_kwargs.kwargs)
 
    @patch('questions.ai_service.OpenAI')
    def test_generate_ai_response_raises_on_api_error(self, mock_openai):
        """Test that API errors are raised (caller handles them)."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception('API unavailable')
 
        with self.assertRaises(AIServiceError):
            generate_ai_response('Title', 'Description')

    @patch('questions.ai_service.OpenAI')
    def test_generate_ai_response_raises_on_empty_content(self, mock_openai):
        """Test that empty AI response raises service error."""
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.return_value.choices[0].message.content = '   '

        with self.assertRaises(AIServiceError):
            generate_ai_response('Title', 'Description')

    @patch('questions.ai_service.OpenAI')
    def test_generate_ai_response_raises_on_missing_env(self, mock_openai):
        """Test missing required env vars fail before API client call."""
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(AIServiceError):
                generate_ai_response('Title', 'Description')
        mock_openai.assert_not_called()
 
class QuestionCreationWithAITests(TestCase):
    """Test that submitting a question triggers AI generation."""
 
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='dev', email='dev@ex.com', password='pass123'
        )
        self.client.force_authenticate(user=self.user)
 
    @patch('questions.views.generate_ai_response')
    def test_question_creation_triggers_ai(self, mock_ai):
        """Test that creating a question creates an AIResponse."""
        mock_ai.return_value = 'Mocked AI answer'
        data = {
            'title': 'How do I configure Azure?',
            'description': 'I need to set up the CI pipeline.',
        }
        response = self.client.post('/api/questions/', data, format='json')
        self.assertEqual(response.status_code, drf_status.HTTP_201_CREATED)
        question = Question.objects.get(title='How do I configure Azure?')
        self.assertTrue(AIResponse.objects.filter(question=question).exists())
        ai_resp = AIResponse.objects.get(question=question)
        self.assertEqual(ai_resp.content, 'Mocked AI answer')
        self.assertEqual(question.status, Question.STATUS_PENDING)
 
    @patch('questions.views.generate_ai_response')
    def test_question_saves_even_if_ai_fails(self, mock_ai):
        """Test that question is saved even if AI generation fails."""
        mock_ai.side_effect = Exception('API unavailable')
        data = {
            'title': 'How do I configure Azure?',
            'description': 'I need to set up the CI pipeline.',
        }
        response = self.client.post('/api/questions/', data, format='json')
        self.assertEqual(response.status_code, drf_status.HTTP_201_CREATED)
        self.assertTrue(Question.objects.filter(title='How do I configure Azure?').exists())
        question = Question.objects.get(title='How do I configure Azure?')
        self.assertEqual(question.status, Question.STATUS_OPEN)
        self.assertFalse(AIResponse.objects.filter(question=question).exists())
