from django.contrib import admin
from .models import Question, AIResponse, ApprovedAnswer, Tag, Vote, ReviewAction
 
admin.site.register(Question)
admin.site.register(AIResponse)
admin.site.register(ApprovedAnswer)
admin.site.register(Tag)
admin.site.register(Vote)
admin.site.register(ReviewAction)
