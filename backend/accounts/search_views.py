from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.contrib.auth import get_user_model
from django.db.models import Q
from quiz.models import Subject
from blog.models import BlogPost
from lostandfound.models import LostFoundItem

User = get_user_model()


class SearchView(APIView):
    """Global search across quizzes, blog posts, lost & found, and users."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response({'results': []})

        results = []

        # Search quiz subjects
        subjects = Subject.objects.filter(
            Q(name__icontains=q) | Q(description__icontains=q)
        )[:5]
        for s in subjects:
            results.append({
                'type': 'quiz',
                'id': s.id,
                'title': s.name,
                'subtitle': s.description[:80] if s.description else 'Quiz subject',
                'url': '/quiz',
            })

        # Search blog posts
        posts = BlogPost.objects.filter(
            Q(title__icontains=q) | Q(content__icontains=q),
            is_published=True,
        )[:5]
        for p in posts:
            results.append({
                'type': 'blog',
                'id': p.id,
                'title': p.title,
                'subtitle': p.excerpt[:80] if p.excerpt else '',
                'url': '/blog',
            })

        # Search lost & found
        items = LostFoundItem.objects.filter(
            Q(title__icontains=q) | Q(description__icontains=q)
        )[:5]
        for item in items:
            results.append({
                'type': 'lost_found',
                'id': item.id,
                'title': item.title,
                'subtitle': f"{item.get_item_type_display()} — {item.location}",
                'url': '/lost-found',
            })

        # Search users
        users = User.objects.filter(
            Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q)
        )[:5]
        for u in users:
            results.append({
                'type': 'user',
                'id': u.id,
                'title': u.get_full_name() or u.username,
                'subtitle': f"@{u.username} — {u.role}",
                'url': '/study-buddy',
            })

        return Response({'results': results[:15]})
