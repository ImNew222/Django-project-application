from rest_framework import serializers
from .models import PlayerStats


class PlayerStatsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    accuracy = serializers.ReadOnlyField()
    rank_title = serializers.ReadOnlyField()
    elo_tier = serializers.ReadOnlyField()
    elo_tier_icon = serializers.ReadOnlyField()
    pvp_total = serializers.ReadOnlyField()
    pvp_winrate = serializers.ReadOnlyField()

    class Meta:
        model = PlayerStats
        fields = [
            'id', 'username', 'total_quizzes', 'total_correct',
            'total_questions_answered', 'total_score', 'current_streak',
            'best_streak', 'rank_points', 'accuracy', 'rank_title',
            'elo_rating', 'elo_tier', 'elo_tier_icon',
            'pvp_wins', 'pvp_losses', 'pvp_draws', 'pvp_total', 'pvp_winrate',
            'daily_streak', 'best_daily_streak', 'last_daily_completed',
        ]


class LeaderboardSerializer(serializers.ModelSerializer):
    """Leaderboard view — shows rank position."""
    username = serializers.CharField(source='user.username', read_only=True)
    rank_title = serializers.ReadOnlyField()
    accuracy = serializers.ReadOnlyField()
    elo_tier = serializers.ReadOnlyField()
    elo_tier_icon = serializers.ReadOnlyField()

    class Meta:
        model = PlayerStats
        fields = [
            'username', 'rank_points', 'rank_title', 'total_quizzes',
            'current_streak', 'best_streak', 'accuracy',
            'elo_rating', 'elo_tier', 'elo_tier_icon',
            'pvp_wins', 'pvp_losses', 'pvp_draws',
        ]
