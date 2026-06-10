from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ApprovedSeniorEmail, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )


@admin.register(ApprovedSeniorEmail)
class ApprovedSeniorEmailAdmin(admin.ModelAdmin):
    list_display = ['email', 'note', 'added_at']
    search_fields = ['email', 'note']
    ordering = ['email']