from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import PlayerStats
from .serializers import PlayerStatsSerializer, LeaderboardSerializer


class LeaderboardView(generics.ListAPIView):
    """Top players ranked by points."""
    serializer_class = LeaderboardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PlayerStats.objects.filter(total_quizzes__gt=0).order_by('-rank_points')[:50]


class MyStatsView(APIView):
    """Get current user's stats and rank position."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stats, created = PlayerStats.objects.get_or_create(user=request.user)
        serializer = PlayerStatsSerializer(stats)

        # Calculate rank position
        rank = PlayerStats.objects.filter(rank_points__gt=stats.rank_points).count() + 1

        data = serializer.data
        data['rank_position'] = rank
        data['total_players'] = PlayerStats.objects.filter(total_quizzes__gt=0).count()

        return Response(data)
