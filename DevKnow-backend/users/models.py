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