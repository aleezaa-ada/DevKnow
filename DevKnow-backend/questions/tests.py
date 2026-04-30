from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import AIResponse, ApprovedAnswer, Question, Tag

User = get_user_model()


class TagModelTests(TestCase):
    """Tests for Tag model."""

    def test_create_tag(self):
        """Test creating a tag."""
        tag = Tag.objects.create(name='Python')
        self.assertEqual(tag.name, 'Python')
        self.assertEqual(tag.usage_count, 0)

    def test_tag_unique_constraint(self):
        """Test that tag names are unique."""
        Tag.objects.create(name='Django')
        with self.assertRaises(Exception):  # IntegrityError
            Tag.objects.create(name='Django')

    def test_tag_str_representation(self):
        """Test __str__ returns tag name."""
        tag = Tag.objects.create(name='REST API')
        self.assertEqual(str(tag), 'REST API')


class QuestionModelTests(TestCase):
    """Tests for Question model."""

    def setUp(self):
        self.author = User.objects.create_user(
            username='author', email='author@ex.com', password='pass123'
        )
        self.tag1 = Tag.objects.create(name='Python')
        self.tag2 = Tag.objects.create(name='Debugging')

    def test_create_question(self):
        """Test creating a question."""
        question = Question.objects.create(
            author=self.author,
            title='How to use decorators?',
            description='I want to understand Python decorators in detail.',
            status=Question.STATUS_OPEN
        )
        self.assertEqual(question.title, 'How to use decorators?')
        self.assertEqual(question.status, Question.STATUS_OPEN)
        self.assertEqual(question.author, self.author)

    def test_question_status_choices(self):
        """Test that only valid statuses are accepted."""
        question = Question.objects.create(
            author=self.author,
            title='Test',
            description='Test',
            status=Question.STATUS_PENDING
        )
        self.assertEqual(question.status, Question.STATUS_PENDING)

    def test_question_default_status_is_open(self):
        """Test that default status is OPEN."""
        question = Question.objects.create(
            author=self.author,
            title='Test',
            description='This is a test description for validating default status'
        )
        self.assertEqual(question.status, Question.STATUS_OPEN)

    def test_question_many_to_many_tags(self):
        """Test adding tags to question."""
        question = Question.objects.create(
            author=self.author,
            title='Test',
            description='This is a test description for verifying many-to-many relationships'
        )
        question.tags.add(self.tag1, self.tag2)
        self.assertEqual(question.tags.count(), 2)
        self.assertIn(self.tag1, question.tags.all())

    def test_question_timestamps(self):
        """Test created_at and updated_at are set."""
        question = Question.objects.create(
            author=self.author,
            title='Test',
            description='This is a test description for checking timestamp fields'
        )
        self.assertIsNotNone(question.created_at)
        self.assertIsNotNone(question.updated_at)

    def test_question_str_representation(self):
        """Test __str__ returns title."""
        question = Question.objects.create(
            author=self.author,
            title='My Question',
            description='This is a descriptive question for testing string representation'
        )
        self.assertEqual(str(question), 'My Question')

    def test_question_cascade_delete_on_author(self):
        """Test that deleting author deletes their questions."""
        question = Question.objects.create(
            author=self.author,
            title='Test',
            description='This is a test description for verifying cascade delete on author deletion'
        )
        self.author.delete()
        self.assertFalse(Question.objects.filter(pk=question.pk).exists())

    def test_question_ordering_by_created_at_descending(self):
        """Test questions are ordered by created_at descending."""
        q1 = Question.objects.create(
            author=self.author, title='Q1', description='This is question one with valid length'
        )
        q2 = Question.objects.create(
            author=self.author, title='Q2', description='This is question two with valid length'
        )
        questions = list(Question.objects.all())
        self.assertEqual(questions[0], q2)  # Most recent first
        self.assertEqual(questions[1], q1)


class AIResponseModelTests(TestCase):
    """Tests for AIResponse model."""

    def setUp(self):
        self.author = User.objects.create_user(
            username='author', email='author@ex.com', password='pass123'
        )
        self.question = Question.objects.create(
            author=self.author,
            title='Test',
            description='Test',
            status=Question.STATUS_OPEN
        )

    def test_create_ai_response(self):
        """Test creating an AI response."""
        ai_resp = AIResponse.objects.create(
            question=self.question,
            content='This is an AI-generated answer.',
            model_used='gpt-4o',
            approval_status=AIResponse.STATUS_PENDING
        )
        self.assertEqual(ai_resp.content, 'This is an AI-generated answer.')
        self.assertEqual(ai_resp.model_used, 'gpt-4o')
        self.assertEqual(ai_resp.approval_status, AIResponse.STATUS_PENDING)

    def test_ai_response_default_model(self):
        """Test that default model is gpt-4o."""
        ai_resp = AIResponse.objects.create(
            question=self.question,
            content='Test'
        )
        self.assertEqual(ai_resp.model_used, 'gpt-4o')

    def test_ai_response_one_to_one_constraint(self):
        """Test that only one AI response per question."""
        AIResponse.objects.create(
            question=self.question,
            content='First response'
        )
        with self.assertRaises(Exception):  # IntegrityError
            AIResponse.objects.create(
                question=self.question,
                content='Second response'
            )

    def test_ai_response_str_representation(self):
        """Test __str__ returns formatted string."""
        ai_resp = AIResponse.objects.create(
            question=self.question,
            content='Test'
        )
        self.assertIn(self.question.title, str(ai_resp))


class ApprovedAnswerModelTests(TestCase):
    """Tests for ApprovedAnswer model."""

    def setUp(self):
        self.author = User.objects.create_user(
            username='author', email='author@ex.com', password='pass123'
        )
        self.approver = User.objects.create_user(
            username='approver', email='approver@ex.com', password='pass123', role='senior'
        )
        self.question = Question.objects.create(
            author=self.author,
            title='Test',
            description='Test'
        )
        self.ai_response = AIResponse.objects.create(
            question=self.question,
            content='AI answer'
        )

    def test_create_approved_answer(self):
        """Test creating an approved answer."""
        approved = ApprovedAnswer.objects.create(
            question=self.question,
            ai_response=self.ai_response,
            approved_by=self.approver,
            final_content='Final approved content'
        )
        self.assertEqual(approved.final_content, 'Final approved content')
        self.assertEqual(approved.approved_by, self.approver)
        self.assertEqual(approved.ai_response, self.ai_response)

    def test_approved_answer_timestamp(self):
        """Test that approved_at is set."""
        approved = ApprovedAnswer.objects.create(
            question=self.question,
            ai_response=self.ai_response,
            approved_by=self.approver,
            final_content='Content'
        )
        self.assertIsNotNone(approved.approved_at)

    def test_approved_answer_ai_response_optional(self):
        """Test that ai_response can be null (manual answer)."""
        approved = ApprovedAnswer.objects.create(
            question=self.question,
            ai_response=None,
            approved_by=self.approver,
            final_content='Manually written answer'
        )
        self.assertIsNone(approved.ai_response)

    def test_approved_answer_approver_optional(self):
        """Test that approver can be null."""
        approved = ApprovedAnswer.objects.create(
            question=self.question,
            ai_response=self.ai_response,
            approved_by=None,
            final_content='Content'
        )
        self.assertIsNone(approved.approved_by)


class QuestionListAPITests(TestCase):
    """Tests for question list endpoint GET /api/questions/."""

    def setUp(self):
        self.client = APIClient()
        self.questions_url = '/api/questions/'
        self.author = User.objects.create_user(
            username='author', email='author@ex.com', password='pass123'
        )
        self.tag = Tag.objects.create(name='Python')

    def test_list_questions_unauthenticated(self):
        """Test listing questions without authentication."""
        response = self.client.get(self.questions_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_questions_empty(self):
        """Test listing questions when none exist."""
        self.client.force_authenticate(user=self.author)
        response = self.client.get(self.questions_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_questions_returns_questions(self):
        """Test listing questions returns created questions."""
        self.client.force_authenticate(user=self.author)
        q1 = Question.objects.create(
            author=self.author,
            title='Question 1',
            description='This is the first test question for listing'
        )
        q2 = Question.objects.create(
            author=self.author,
            title='Question 2',
            description='This is the second test question for listing'
        )
        response = self.client.get(self.questions_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_questions_serializer_fields(self):
        """Test that question list has expected fields."""
        self.client.force_authenticate(user=self.author)
        q = Question.objects.create(
            author=self.author,
            title='Test Question',
            description='This is a test description with sufficient length'
        )
        response = self.client.get(self.questions_url)
        self.assertIn('id', response.data[0])
        self.assertIn('title', response.data[0])


class QuestionDetailAPITests(TestCase):
    """Tests for question detail endpoint GET /api/questions/:id/."""

    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username='author', email='author@ex.com', password='pass123'
        )
        self.question = Question.objects.create(
            author=self.author,
            title='Test Question',
            description='Test Description'
        )
        self.detail_url = f'/api/questions/{self.question.id}/'

    def test_retrieve_question(self):
        """Test retrieving a single question."""
        self.client.force_authenticate(user=self.author)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Question')

    def test_retrieve_nonexistent_question(self):
        """Test retrieving a question that doesn't exist."""
        self.client.force_authenticate(user=self.author)
        response = self.client.get('/api/questions/9999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class QuestionCreateAPITests(TestCase):
    """Tests for question creation POST /api/questions/."""

    def setUp(self):
        self.client = APIClient()
        self.questions_url = '/api/questions/'
        self.author = User.objects.create_user(
            username='author', email='author@ex.com', password='pass123'
        )

    def test_create_question_authenticated(self):
        """Test creating a question when authenticated."""
        self.client.force_authenticate(user=self.author)
        data = {
            'title': 'New Question',
            'description': 'This is a test question.',
            'status': Question.STATUS_OPEN
        }
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Question')
        self.assertTrue(Question.objects.filter(title='New Question').exists())

    def test_create_question_unauthenticated(self):
        """Test creating a question without authentication."""
        data = {
            'title': 'New Question',
            'description': 'This is a detailed test description'
        }
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_question_missing_title(self):
        """Test creating a question without title."""
        self.client.force_authenticate(user=self.author)
        data = {'description': 'This is a valid description for testing'}
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_question_missing_description(self):
        """Test creating a question without description."""
        self.client.force_authenticate(user=self.author)
        data = {'title': 'Valid Title'}
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_question_author_set_to_current_user(self):
        """Test that author is automatically set to current user."""
        other_user = User.objects.create_user(
            username='other', email='other@ex.com', password='pass123'
        )
        self.client.force_authenticate(user=self.author)
        data = {
            'title': 'Test Question Title',
            'description': 'This is a test description for checking author'
        }
        response = self.client.post(self.questions_url, data, format='json')
        question = Question.objects.get(title='Test Question Title')
        self.assertEqual(question.author, self.author)
        self.assertNotEqual(question.author, other_user)

    def test_create_question_with_tag_names(self):
        """Test creating a question with tag_names creates/reuses tags."""
        self.client.force_authenticate(user=self.author)
        data = {
            'title': 'Question with tags',
            'description': 'A detailed description for tag creation test',
            'tag_names': ['Python', 'API']
        }
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        question = Question.objects.get(title='Question with tags')
        self.assertEqual(question.tags.count(), 2)
        self.assertTrue(Tag.objects.filter(name='python').exists())
        self.assertTrue(Tag.objects.filter(name='api').exists())

    def test_create_question_with_existing_tag_increments_usage_count(self):
        """Test existing tag is reused and usage_count increments."""
        existing_tag = Tag.objects.create(name='python', usage_count=3)
        self.client.force_authenticate(user=self.author)
        data = {
            'title': 'Question with existing tag',
            'description': 'A detailed description for usage count increment',
            'tag_names': ['Python']
        }
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        existing_tag.refresh_from_db()
        self.assertEqual(existing_tag.usage_count, 4)

    def test_create_question_rejects_non_list_tag_names(self):
        """Test tag_names must be a list."""
        self.client.force_authenticate(user=self.author)
        data = {
            'title': 'Question invalid tags payload',
            'description': 'A detailed description for invalid tags payload',
            'tag_names': 'python'
        }
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_question_rejects_blank_tag_names(self):
        """Test empty/whitespace tag names are rejected with 400."""
        self.client.force_authenticate(user=self.author)
        data = {
            'title': 'Question with blank tags',
            'description': 'A detailed description for blank tags handling',
            'tag_names': ['Python', '   ', '', 'API']
        }
        response = self.client.post(self.questions_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class QuestionFilterAPITests(TestCase):
    """Tests for question list filtering by status and tag."""

    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username='author_filter', email='author_filter@ex.com', password='pass123'
        )
        self.client.force_authenticate(user=self.author)

        self.tag_python = Tag.objects.create(name='python')
        self.tag_debug = Tag.objects.create(name='debugging')

        self.open_question = Question.objects.create(
            author=self.author,
            title='Open question',
            description='Description for open question',
            status=Question.STATUS_OPEN
        )
        self.open_question.tags.add(self.tag_python)

        self.answered_question = Question.objects.create(
            author=self.author,
            title='Answered question',
            description='Description for answered question',
            status=Question.STATUS_ANSWERED
        )
        self.answered_question.tags.add(self.tag_debug)

    def test_filter_questions_by_status(self):
        """Test filtering questions by status query param."""
        response = self.client.get('/api/questions/?status=open')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Open question')

    def test_filter_questions_by_tag(self):
        """Test filtering questions by tag query param."""
        response = self.client.get('/api/questions/?tag=python')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Open question')


class QuestionPermissionAPITests(TestCase):
    """Tests for update/delete ownership and auth boundaries."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner', email='owner@ex.com', password='pass123'
        )
        self.other_user = User.objects.create_user(
            username='other_owner', email='other_owner@ex.com', password='pass123'
        )
        self.question = Question.objects.create(
            author=self.owner,
            title='Owner question',
            description='Description owned by the first user'
        )
        self.detail_url = f'/api/questions/{self.question.id}/'

    def test_retrieve_question_unauthenticated_returns_401(self):
        """Test detail endpoint requires authentication."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_update_question(self):
        """Test owner can update their own question."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            self.detail_url,
            {'title': 'Updated owner question'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.question.refresh_from_db()
        self.assertEqual(self.question.title, 'Updated owner question')

    def test_non_owner_cannot_update_question(self):
        """Test non-owner gets 403 when updating question."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.patch(
            self.detail_url,
            {'title': 'Illegal update attempt'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_question(self):
        """Test owner can delete their own question."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Question.objects.filter(pk=self.question.pk).exists())

    def test_non_owner_cannot_delete_question(self):
        """Test non-owner gets 403 when deleting question."""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Question.objects.filter(pk=self.question.pk).exists())

class ReviewAnswerAPITests(TestCase):
    """Tests for the review/approve/reject endpoint."""
 
    def setUp(self):
        self.client = APIClient()
        self.standard_user = User.objects.create_user(
            username='dev', email='dev@ex.com', password='pass123', role='standard'
        )
        self.senior_user = User.objects.create_user(
            username='senior', email='senior@ex.com', password='pass123', role='senior'
        )
        self.question = Question.objects.create(
            author=self.standard_user,
            title='Test Question',
            description='Test description',
            status=Question.STATUS_PENDING
        )
        self.ai_response = AIResponse.objects.create(
            question=self.question,
            content='AI generated answer',
            approval_status=AIResponse.STATUS_PENDING
        )
        self.review_url = f'/api/questions/{self.ai_response.id}/review/'
 
    def test_standard_user_cannot_review(self):
        """Standard users get 403 on the review endpoint."""
        self.client.force_authenticate(user=self.standard_user)
        response = self.client.post(self.review_url, {'action': 'approved'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
 
    def test_unauthenticated_cannot_review(self):
        """Unauthenticated users get 401 on the review endpoint."""
        response = self.client.post(self.review_url, {'action': 'approved'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
 
    def test_senior_can_approve(self):
        """Senior developer can approve an AI response."""
        self.client.force_authenticate(user=self.senior_user)
        response = self.client.post(
            self.review_url,
            {'action': 'approved'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check AIResponse status updated
        self.ai_response.refresh_from_db()
        self.assertEqual(self.ai_response.approval_status, AIResponse.STATUS_APPROVED)
        # Check question status updated
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.STATUS_ANSWERED)
        # Check ApprovedAnswer was created
        self.assertTrue(ApprovedAnswer.objects.filter(question=self.question).exists())
 
    def test_senior_can_approve_with_edit(self):
        """Senior developer can approve with edited content."""
        self.client.force_authenticate(user=self.senior_user)
        response = self.client.post(
            self.review_url,
            {'action': 'edited', 'edited_content': 'Improved answer'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        approved = ApprovedAnswer.objects.get(question=self.question)
        self.assertEqual(approved.final_content, 'Improved answer')
        self.assertEqual(approved.approved_by, self.senior_user)
 
    def test_senior_can_reject(self):
        """Senior developer can reject an AI response."""
        self.client.force_authenticate(user=self.senior_user)
        response = self.client.post(
            self.review_url,
            {'action': 'rejected', 'review_notes': 'Incorrect info'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ai_response.refresh_from_db()
        self.assertEqual(self.ai_response.approval_status, AIResponse.STATUS_REJECTED)
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.STATUS_OPEN)
        self.assertFalse(ApprovedAnswer.objects.filter(question=self.question).exists())
 
    def test_review_creates_audit_log(self):
        """Every review action creates a ReviewAction record."""
        from .models import ReviewAction
        self.client.force_authenticate(user=self.senior_user)
        self.client.post(self.review_url, {'action': 'approved'}, format='json')
        self.assertTrue(ReviewAction.objects.filter(ai_response=self.ai_response).exists())

    def test_reject_after_approve_removes_approved_answer(self):
        """Rejecting a previously approved response removes the ApprovedAnswer."""
        self.client.force_authenticate(user=self.senior_user)
        # First approve
        self.client.post(self.review_url, {'action': 'approved'}, format='json')
        self.assertTrue(ApprovedAnswer.objects.filter(question=self.question).exists())
        # Then reject
        self.client.post(self.review_url, {'action': 'rejected', 'review_notes': 'Changed mind'}, format='json')
        self.assertFalse(ApprovedAnswer.objects.filter(question=self.question).exists())
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.STATUS_OPEN)

    def test_approve_after_reject_creates_approved_answer_and_sets_status(self):
        """Re-approving after a rejection creates the ApprovedAnswer and sets question to answered."""
        self.client.force_authenticate(user=self.senior_user)
        # Approve
        self.client.post(self.review_url, {'action': 'approved'}, format='json')
        # Reject
        self.client.post(self.review_url, {'action': 'rejected'}, format='json')
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.STATUS_OPEN)
        # Approve again
        response = self.client.post(self.review_url, {'action': 'approved'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(ApprovedAnswer.objects.filter(question=self.question).exists())
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.STATUS_ANSWERED)

class SearchAPITests(TestCase):
    """Tests for the search endpoint."""
 
    def setUp(self):
        self.client = APIClient()
        self.search_url = '/api/questions/search/'
        self.user = User.objects.create_user(
            username='dev', email='dev@ex.com', password='pass123'
        )
        self.client.force_authenticate(user=self.user)
        Question.objects.create(
            author=self.user,
            title='How to configure Azure CI pipeline',
            description='Setting up Azure DevOps for microservices'
        )
        Question.objects.create(
            author=self.user,
            title='Python decorators explained',
            description='How to write and use Python decorators'
        )
 
    def test_search_requires_auth(self):
        """Search endpoint requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.search_url, {'q': 'azure'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
 
    def test_search_returns_matching_questions(self):
        """Search returns questions matching the query."""
        response = self.client.get(self.search_url, {'q': 'azure'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [q['title'] for q in response.data]
        self.assertIn('How to configure Azure CI pipeline', titles)
        self.assertNotIn('Python decorators explained', titles)
 
    def test_search_empty_query_returns_empty(self):
        """Empty search query returns no results."""
        response = self.client.get(self.search_url, {'q': ''})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
 
    def test_search_no_results(self):
        """Search returns empty list when nothing matches."""
        response = self.client.get(self.search_url, {'q': 'kubernetes'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

class VoteAPITests(TestCase):
    """Tests for the voting endpoint."""
 
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username='author', email='author@ex.com', password='pass123'
        )
        self.voter = User.objects.create_user(
            username='voter', email='voter@ex.com', password='pass123'
        )
        self.question = Question.objects.create(
            author=self.author, title='Q', description='D'
        )
        approver = User.objects.create_user(
            username='approver', email='approver@ex.com', password='pass', role='senior'
        )
        self.answer = ApprovedAnswer.objects.create(
            question=self.question,
            approved_by=approver,
            final_content='Final answer'
        )
        self.vote_url = f'/api/questions/answers/{self.answer.id}/vote/'
 
    def test_vote_requires_auth(self):
        response = self.client.post(self.vote_url, {'value': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
 
    def test_upvote(self):
        self.client.force_authenticate(user=self.voter)
        response = self.client.post(self.vote_url, {'value': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['voted'], 1)
        self.assertTrue(response.data['created'])
 
    def test_downvote(self):
        self.client.force_authenticate(user=self.voter)
        response = self.client.post(self.vote_url, {'value': -1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['voted'], -1)
 
    def test_vote_on_own_question_forbidden(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(self.vote_url, {'value': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
 
    def test_duplicate_vote_updates_not_creates(self):
        from .models import Vote
        self.client.force_authenticate(user=self.voter)
        self.client.post(self.vote_url, {'value': 1}, format='json')
        response = self.client.post(self.vote_url, {'value': -1}, format='json')
        self.assertFalse(response.data['created'])
        self.assertEqual(Vote.objects.filter(user=self.voter, answer=self.answer).count(), 1)
 
    def test_invalid_vote_value(self):
        self.client.force_authenticate(user=self.voter)
        response = self.client.post(self.vote_url, {'value': 5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
