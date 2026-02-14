from django.urls import path
from . import views
from .ai_views import AIGenerateQuestionsView

urlpatterns = [
    path('subjects/', views.SubjectListView.as_view(), name='subject-list'),
    path('start/', views.StartQuizView.as_view(), name='start-quiz'),
    path('answer/', views.SubmitAnswerView.as_view(), name='submit-answer'),
    path('<int:session_id>/complete/', views.CompleteQuizView.as_view(), name='complete-quiz'),
    path('<int:session_id>/tab-switch/', views.ReportTabSwitchView.as_view(), name='report-tab-switch'),
    path('history/', views.QuizHistoryView.as_view(), name='quiz-history'),
    path('session/<int:pk>/', views.QuizSessionDetailView.as_view(), name='quiz-session-detail'),
    path('ai-generate/', AIGenerateQuestionsView.as_view(), name='ai-generate-questions'),
]
