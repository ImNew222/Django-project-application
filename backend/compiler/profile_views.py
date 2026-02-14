"""
Profile Stats API — serves coding stats, activity heatmap, and match history.
"""
import datetime
from collections import defaultdict

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    CodeSubmission, BattleSession, DailySubmission,
    TournamentMatch, TournamentParticipant,
)
from leaderboard.models import PlayerStats


class ProfileStatsView(APIView):
    """GET: aggregate coding stats, activity heatmap, and match history."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        stats, _ = PlayerStats.objects.get_or_create(user=user)
        today = timezone.now().date()
        year_ago = today - datetime.timedelta(days=365)

        # ── Coding Stats ─────────────────────────────────────
        battles_won = BattleSession.objects.filter(
            user=user, status='completed'
        ).count()
        battles_total = BattleSession.objects.filter(user=user).exclude(
            status='in_progress'
        ).count()

        tournament_wins = TournamentParticipant.objects.filter(
            user=user, placement=1
        ).count()
        tournament_played = TournamentParticipant.objects.filter(
            user=user
        ).count()

        daily_solved = DailySubmission.objects.filter(
            user=user, solved=True
        ).count()

        problems_solved = BattleSession.objects.filter(
            user=user, status='completed'
        ).values('challenge_id').distinct().count()

        code_submissions_count = CodeSubmission.objects.filter(user=user).count()

        # ── Activity Heatmap (last 365 days) ──────────────────
        heatmap = defaultdict(int)

        # Code submissions
        cs = (
            CodeSubmission.objects.filter(user=user, created_at__date__gte=year_ago)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(n=Count('id'))
        )
        for row in cs:
            heatmap[row['day'].isoformat()] += row['n']

        # Battle sessions
        bs = (
            BattleSession.objects.filter(user=user, started_at__date__gte=year_ago)
            .annotate(day=TruncDate('started_at'))
            .values('day')
            .annotate(n=Count('id'))
        )
        for row in bs:
            heatmap[row['day'].isoformat()] += row['n']

        # Daily submissions
        ds = (
            DailySubmission.objects.filter(user=user, submitted_at__date__gte=year_ago)
            .annotate(day=TruncDate('submitted_at'))
            .values('day')
            .annotate(n=Count('id'))
        )
        for row in ds:
            heatmap[row['day'].isoformat()] += row['n']

        # Tournament matches (as p1 or p2)
        from django.db.models import Q
        tm = (
            TournamentMatch.objects.filter(
                Q(player1=user) | Q(player2=user),
                started_at__date__gte=year_ago,
                started_at__isnull=False,
            )
            .annotate(day=TruncDate('started_at'))
            .values('day')
            .annotate(n=Count('id'))
        )
        for row in tm:
            heatmap[row['day'].isoformat()] += row['n']

        # ── Recent Match History (last 20) ────────────────────
        recent_battles = list(
            BattleSession.objects.filter(user=user)
            .exclude(status='in_progress')
            .select_related('challenge')
            .order_by('-started_at')[:10]
        )

        recent_tournaments = list(
            TournamentMatch.objects.filter(
                Q(player1=user) | Q(player2=user),
                status='completed',
            )
            .select_related('tournament', 'player1', 'player2', 'winner')
            .order_by('-finished_at')[:10]
        )

        history = []

        for b in recent_battles:
            history.append({
                'type': 'battle',
                'challenge': b.challenge.title if b.challenge else 'Unknown',
                'result': 'won' if b.status == 'completed' else 'lost',
                'points': b.points_earned,
                'date': b.started_at.isoformat() if b.started_at else None,
            })

        for m in recent_tournaments:
            opponent = None
            if m.player1 == user:
                opponent = m.player2.username if m.player2 else 'BYE'
            else:
                opponent = m.player1.username if m.player1 else 'BYE'

            history.append({
                'type': 'tournament',
                'challenge': m.tournament.name if m.tournament else 'Unknown',
                'opponent': opponent,
                'result': 'won' if m.winner == user else 'lost',
                'date': m.finished_at.isoformat() if m.finished_at else None,
            })

        # Sort by date descending
        history.sort(key=lambda x: x.get('date') or '', reverse=True)
        history = history[:20]

        return Response({
            'coding_stats': {
                'elo_rating': stats.elo_rating,
                'elo_tier': stats.elo_tier,
                'elo_tier_icon': stats.elo_tier_icon,
                'rank_points': stats.rank_points,
                'rank_title': stats.rank_title,
                'battles_won': battles_won,
                'battles_total': battles_total,
                'tournament_wins': tournament_wins,
                'tournament_played': tournament_played,
                'daily_solved': daily_solved,
                'daily_streak': stats.daily_streak,
                'best_daily_streak': stats.best_daily_streak,
                'problems_solved': problems_solved,
                'code_submissions': code_submissions_count,
                'pvp_wins': stats.pvp_wins,
                'pvp_losses': stats.pvp_losses,
                'pvp_winrate': stats.pvp_winrate,
            },
            'heatmap': dict(heatmap),
            'history': history,
        })
