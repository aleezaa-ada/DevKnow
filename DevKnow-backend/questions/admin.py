from django.contrib import admin

from .models import AIResponse, ApprovedAnswer, Question, ReviewAction, Tag, Vote

admin.site.register(Question)
admin.site.register(AIResponse)
admin.site.register(ApprovedAnswer)
admin.site.register(Tag)
admin.site.register(Vote)
admin.site.register(ReviewAction)
