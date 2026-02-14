from django.contrib import admin
from .models import (
    CodeSubmission, CodeChallenge, TestCase, BattleSession, BattleSubmission,
    PvPBattle, DailyChallenge, DailySubmission,
    Tournament, TournamentParticipant, TournamentMatch,
)
from .notification_models import Notification
from .invite_models import BattleInvite


@admin.register(CodeSubmission)
class CodeSubmissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'language_name', 'status', 'execution_time', 'created_at']
    list_filter = ['status', 'language_name']
    search_fields = ['user__username', 'source_code']
    readonly_fields = ['judge0_token']
    ordering = ['-created_at']


class TestCaseInline(admin.TabularInline):
    model = TestCase
    extra = 2
    fields = ['input_data', 'expected_output', 'is_sample', 'order']


@admin.register(CodeChallenge)
class CodeChallengeAdmin(admin.ModelAdmin):
    list_display = ['title', 'difficulty', 'points', 'time_limit_minutes', 'is_active', 'created_at']
    list_filter = ['difficulty', 'is_active']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [TestCaseInline]


@admin.register(BattleSession)
class BattleSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'challenge', 'status', 'attempts_count', 'points_earned', 'started_at']
    list_filter = ['status']
    search_fields = ['user__username', 'challenge__title']


@admin.register(BattleSubmission)
class BattleSubmissionAdmin(admin.ModelAdmin):
    list_display = ['session', 'language_name', 'passed_tests', 'total_tests', 'all_passed', 'created_at']
    list_filter = ['all_passed']


@admin.register(PvPBattle)
class PvPBattleAdmin(admin.ModelAdmin):
    list_display = ['room_code', 'player1', 'player2', 'status', 'difficulty', 'winner', 'points_awarded', 'created_at']
    list_filter = ['status', 'difficulty']
    search_fields = ['player1__username', 'player2__username', 'room_code']


@admin.register(DailyChallenge)
class DailyChallengeAdmin(admin.ModelAdmin):
    list_display = ['date', 'challenge', 'difficulty']
    list_filter = ['difficulty']
    search_fields = ['challenge__title']


@admin.register(DailySubmission)
class DailySubmissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'daily', 'solved', 'solve_time', 'attempts', 'submitted_at']
    list_filter = ['solved']
    search_fields = ['user__username']


class TournamentParticipantInline(admin.TabularInline):
    model = TournamentParticipant
    extra = 0
    fields = ['user', 'seed', 'eliminated', 'placement']


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'max_players', 'status', 'difficulty', 'winner', 'created_at']
    list_filter = ['status', 'difficulty', 'max_players']
    search_fields = ['name', 'created_by__username', 'join_code']
    inlines = [TournamentParticipantInline]


@admin.register(TournamentMatch)
class TournamentMatchAdmin(admin.ModelAdmin):
    list_display = ['tournament', 'round_number', 'match_number', 'player1', 'player2', 'winner', 'status']
    list_filter = ['status', 'round_number']
    search_fields = ['tournament__name']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'sender', 'notif_type', 'title', 'is_read', 'created_at']
    list_filter = ['notif_type', 'is_read']
    search_fields = ['recipient__username', 'title']


@admin.register(BattleInvite)
class BattleInviteAdmin(admin.ModelAdmin):
    list_display = ['sender', 'receiver', 'difficulty', 'status', 'created_at', 'expires_at']
    list_filter = ['status', 'difficulty']
    search_fields = ['sender__username', 'receiver__username']

