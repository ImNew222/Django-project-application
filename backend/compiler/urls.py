from django.urls import path
from . import views
from . import profile_views
from . import friends_views
from . import notification_views
from . import invite_views
from . import ai_explanation_views

urlpatterns = [
    # Phase 1 — Compiler
    path('languages/', views.LanguagesView.as_view(), name='compiler-languages'),
    path('run/', views.SubmitCodeView.as_view(), name='compiler-run'),
    path('submission/<int:pk>/', views.SubmissionDetailView.as_view(), name='compiler-detail'),
    path('history/', views.MySubmissionsView.as_view(), name='compiler-history'),

    # Phase 2 — Code Battle
    path('challenges/', views.ChallengeListView.as_view(), name='challenge-list'),
    path('challenges/<slug:slug>/', views.ChallengeDetailView.as_view(), name='challenge-detail'),
    path('battle/start/', views.StartBattleView.as_view(), name='battle-start'),
    path('battle/<int:session_id>/submit/', views.SubmitBattleSolutionView.as_view(), name='battle-submit'),
    path('battle/<int:session_id>/result/', views.BattleResultView.as_view(), name='battle-result'),
    path('battle/history/', views.BattleHistoryView.as_view(), name='battle-history'),

    # Phase 4 — Daily Challenges
    path('daily/', views.TodaysChallengeView.as_view(), name='daily-challenge'),
    path('daily/submit/', views.DailySubmitView.as_view(), name='daily-submit'),
    path('daily/leaderboard/', views.DailyLeaderboardView.as_view(), name='daily-leaderboard'),
    path('daily/streak/', views.DailyStreakView.as_view(), name='daily-streak'),

    # Phase 5 — Tournaments
    path('tournaments/', views.TournamentListCreateView.as_view(), name='tournament-list'),
    path('tournaments/join/', views.TournamentJoinByCodeView.as_view(), name='tournament-join-code'),
    path('tournaments/<int:pk>/', views.TournamentDetailView.as_view(), name='tournament-detail'),
    path('tournaments/<int:pk>/join/', views.TournamentJoinView.as_view(), name='tournament-join'),
    path('tournaments/<int:pk>/start/', views.TournamentStartView.as_view(), name='tournament-start'),
    path('tournaments/<int:pk>/submit/', views.TournamentSubmitView.as_view(), name='tournament-submit'),
    path('tournaments/<int:pk>/delete/', views.TournamentDeleteView.as_view(), name='tournament-delete'),
    path('tournaments/<int:pk>/leave/', views.TournamentLeaveView.as_view(), name='tournament-leave'),
    path('tournaments/<int:pk>/check-timeout/', views.TournamentCheckTimeoutView.as_view(), name='tournament-timeout'),

    # Profile
    path('profile/stats/', profile_views.ProfileStatsView.as_view(), name='profile-stats'),

    # Community Challenges
    path('community-challenges/', views.CommunityChallengeCRUDView.as_view(), name='community-challenges'),

    # PvP Replay
    path('pvp/<int:battle_id>/replay/', views.PvPReplayView.as_view(), name='pvp-replay'),

    # Friends / Follow
    path('friends/search/', friends_views.UserSearchView.as_view(), name='friends-search'),
    path('friends/follow/<int:user_id>/', friends_views.FollowToggleView.as_view(), name='friends-follow'),
    path('friends/', friends_views.FollowListView.as_view(), name='friends-list'),

    # Phase 9 — Notifications
    path('notifications/', notification_views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/read/', notification_views.NotificationMarkReadView.as_view(), name='notification-read'),
    path('notifications/unread-count/', notification_views.NotificationUnreadCountView.as_view(), name='notification-unread'),

    # Phase 9 — Battle Invites
    path('invites/send/', invite_views.SendInviteView.as_view(), name='invite-send'),
    path('invites/<int:pk>/respond/', invite_views.RespondInviteView.as_view(), name='invite-respond'),
    path('invites/pending/', invite_views.PendingInvitesView.as_view(), name='invite-pending'),

    # Phase 11 — AI Explanation
    path('ai/explain/', ai_explanation_views.GetExplanationView.as_view(), name='ai-explain'),

    # Phase 12 — Tower Defense
    path('tower-defense/submit/', views.TowerDefenseSubmitView.as_view(), name='td-submit'),
    path('tower-defense/leaderboard/', views.TowerDefenseLeaderboardView.as_view(), name='td-leaderboard'),
]

