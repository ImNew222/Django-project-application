from django.contrib import admin
from .models import PlayerStats


@admin.register(PlayerStats)
class PlayerStatsAdmin(admin.ModelAdmin):
    list_display = ['user', 'rank_points', 'total_quizzes', 'total_correct', 'current_streak', 'best_streak']
    ordering = ['-rank_points']
