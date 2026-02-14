from django.urls import path
from . import views

urlpatterns = [
    path('texts/', views.TypingTextListView.as_view(), name='typing-texts'),
    path('random/', views.RandomTextView.as_view(), name='typing-random'),
    path('submit/', views.SubmitResultView.as_view(), name='typing-submit'),
    path('leaderboard/', views.TypingLeaderboardView.as_view(), name='typing-leaderboard'),
    path('history/', views.MyTypingHistoryView.as_view(), name='typing-history'),
]
