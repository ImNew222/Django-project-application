from django.contrib import admin
from .models import Subject, Question, QuizSession, QuizAnswer


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'description']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['text', 'subject', 'difficulty', 'correct_answer']
    list_filter = ['subject', 'difficulty']
    search_fields = ['text']


@admin.register(QuizSession)
class QuizSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'subject', 'difficulty', 'score', 'total_questions', 'is_completed', 'tab_switches', 'started_at']
    list_filter = ['subject', 'difficulty', 'is_completed']


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    list_display = ['session', 'question', 'selected_answer', 'is_correct', 'time_spent']
