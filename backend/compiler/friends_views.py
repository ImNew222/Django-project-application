"""
Friends / Follow system views.
"""
from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .friends_models import Follow
from leaderboard.models import PlayerStats

User = get_user_model()


class UserSearchView(APIView):
    """GET: search users by username."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])

        users = (
            User.objects.filter(username__icontains=q)
            .exclude(id=request.user.id)[:20]
        )

        following_ids = set(
            Follow.objects.filter(follower=request.user)
            .values_list('following_id', flat=True)
        )

        results = []
        for u in users:
            stats = PlayerStats.objects.filter(user=u).first()
            results.append({
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'elo_rating': stats.elo_rating if stats else 1000,
                'elo_tier': stats.elo_tier if stats else 'Bronze',
                'rank_title': stats.rank_title if stats else 'Newbie',
                'is_following': u.id in following_ids,
            })

        return Response(results)


class FollowToggleView(APIView):
    """POST: follow or unfollow a user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if user_id == request.user.id:
            return Response({'error': 'Cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        follow, created = Follow.objects.get_or_create(
            follower=request.user, following=target
        )

        if not created:
            follow.delete()
            return Response({'status': 'unfollowed', 'is_following': False})

        return Response({'status': 'followed', 'is_following': True})


class FollowListView(APIView):
    """GET: list followers and following for current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        following_ids = set(
            Follow.objects.filter(follower=request.user)
            .values_list('following_id', flat=True)
        )

        following_users = User.objects.filter(id__in=following_ids)
        following = []
        for u in following_users:
            stats = PlayerStats.objects.filter(user=u).first()
            following.append({
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'elo_rating': stats.elo_rating if stats else 1000,
                'elo_tier': stats.elo_tier if stats else 'Bronze',
                'rank_title': stats.rank_title if stats else 'Newbie',
                'is_following': True,
            })

        follower_ids = set(
            Follow.objects.filter(following=request.user)
            .values_list('follower_id', flat=True)
        )
        follower_users = User.objects.filter(id__in=follower_ids)
        followers = []
        for u in follower_users:
            stats = PlayerStats.objects.filter(user=u).first()
            followers.append({
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'elo_rating': stats.elo_rating if stats else 1000,
                'elo_tier': stats.elo_tier if stats else 'Bronze',
                'rank_title': stats.rank_title if stats else 'Newbie',
                'is_following': u.id in following_ids,
            })

        return Response({
            'following': following,
            'followers': followers,
            'following_count': len(following),
            'followers_count': len(followers),
        })
