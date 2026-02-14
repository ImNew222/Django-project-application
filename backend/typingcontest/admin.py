from django.contrib import admin
from .models import TypingText, TypingResult


@admin.register(TypingText)
class TypingTextAdmin(admin.ModelAdmin):
    list_display = ['title', 'difficulty', 'word_count']
    list_filter = ['difficulty']


@admin.register(TypingResult)
class TypingResultAdmin(admin.ModelAdmin):
    list_display = ['user', 'text', 'wpm', 'accuracy', 'time_taken', 'created_at']
    list_filter = ['created_at']
