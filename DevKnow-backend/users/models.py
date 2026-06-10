from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('standard', 'Standard Developer'),
        ('senior', 'Senior Developer'),
        ('admin', 'Administrator')
        ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='standard')

    def is_senior(self):
        return self.role in ['senior', 'admin']
    
    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'


class ApprovedSeniorEmail(models.Model):
    """
    Admin-curated list of email addresses pre-approved for the senior developer role.
    When a user registers with a matching email, they are automatically assigned
    the 'senior' role instead of the default 'standard' role.
    """
    email = models.EmailField(
        unique=True,
        help_text='Email address that will automatically receive the Senior Developer role on signup.',
    )
    added_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(
        max_length=255,
        blank=True,
        help_text='Optional note (e.g. name or team) for admin reference.',
    )

    class Meta:
        verbose_name = 'Approved Senior Email'
        verbose_name_plural = 'Approved Senior Emails'
        ordering = ['email']

    def __str__(self):
        return self.email