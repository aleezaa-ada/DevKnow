from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    usage_count = models.IntegerField(default=0)
 
    def __str__(self):
        return self.name
 
 
class Question(models.Model):
    STATUS_OPEN     = 'open'
    STATUS_PENDING  = 'pending'
    STATUS_ANSWERED = 'answered'
    STATUS_CHOICES  = [
        (STATUS_OPEN,     'Open'),
        (STATUS_PENDING,  'Pending Review'),
        (STATUS_ANSWERED, 'Answered'),
    ]
    author      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    title       = models.CharField(max_length=300)
    description = models.TextField()
    tags        = models.ManyToManyField(Tag, blank=True)
    status      = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN
    )
    search_vector = SearchVectorField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
 
    class Meta:
        indexes  = [GinIndex(fields=['search_vector'])]
        ordering = ['-created_at']
 
    def __str__(self):
        return self.title


class AIResponse(models.Model):
    STATUS_PENDING  = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Pending Review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]
    question        = models.OneToOneField(
        Question, on_delete=models.CASCADE, related_name='ai_response'
    )
    content         = models.TextField()
    model_used      = models.CharField(max_length=100, default='gpt-4o')
    approval_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    generated_at    = models.DateTimeField(auto_now_add=True)
 
    def __str__(self):
        return f'AI answer for: {self.question.title}'
 
 
class ApprovedAnswer(models.Model):
    question     = models.OneToOneField(
        Question, on_delete=models.CASCADE, related_name='approved_answer'
    )
    ai_response  = models.ForeignKey(
        AIResponse, on_delete=models.SET_NULL, null=True
    )
    approved_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    final_content = models.TextField()
    approved_at   = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
 
    def __str__(self):
        return f'Approved answer for: {self.question.title}'
 
 
class Vote(models.Model):
    user   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    answer = models.ForeignKey(
        ApprovedAnswer, on_delete=models.CASCADE, related_name='votes'
    )
    value  = models.SmallIntegerField()   # 1 = upvote, -1 = downvote
    created_at = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        unique_together = ('user', 'answer')  # one vote per user per answer
 
 
class ReviewAction(models.Model):
    ACTION_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('edited',   'Edited and Approved'),
    ]
    ai_response    = models.ForeignKey(
        AIResponse, on_delete=models.CASCADE, related_name='review_actions'
    )
    reviewer       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action         = models.CharField(max_length=20, choices=ACTION_CHOICES)
    edited_content = models.TextField(blank=True)
    review_notes   = models.TextField(blank=True)
    reviewed_at    = models.DateTimeField(auto_now_add=True)
