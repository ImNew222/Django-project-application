from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Count, Avg
from quiz.models import QuizSession
from leaderboard.models import PlayerStats

User = get_user_model()


class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['teacher', 'admin']


class StudentListView(APIView):
    """List all students with their activity stats. Teachers/admins only."""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request):
        students = User.objects.filter(role='student').order_by('username')
        data = []
        for student in students:
            # Quiz stats
            sessions = QuizSession.objects.filter(user=student)
            total_quizzes = sessions.count()
            avg_score = sessions.aggregate(avg=Avg('score'))['avg'] or 0

            # Player stats
            try:
                stats = student.stats
                xp = stats.rank_points
                rank = stats.rank_title
                streak = stats.current_streak
            except PlayerStats.DoesNotExist:
                xp = 0
                rank = 'Newbie'
                streak = 0

            data.append({
                'id': student.id,
                'username': student.username,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'email': student.email,
                'gender': student.gender,
                'date_joined': student.date_joined,
                'last_login': student.last_login,
                'total_quizzes': total_quizzes,
                'avg_score': round(avg_score, 1),
                'xp': xp,
                'rank': rank,
                'streak': streak,
                'is_available_for_pairing': student.is_available_for_pairing,
            })

        return Response({
            'total_students': len(data),
            'students': data,
        })


class StudentDetailView(APIView):
    """Detailed student activity. Teachers/admins only."""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request, student_id):
        try:
            student = User.objects.get(id=student_id, role='student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=404)

        sessions = QuizSession.objects.filter(user=student).order_by('-created_at')[:10]
        session_data = [{
            'id': s.id,
            'subject': s.subject.name,
            'difficulty': s.difficulty,
            'score': s.score,
            'total_questions': s.total_questions,
            'created_at': s.created_at,
        } for s in sessions]

        try:
            stats = student.stats
            stats_data = {
                'xp': stats.rank_points,
                'rank_title': stats.rank_title,
                'streak': stats.current_streak,
                'quizzes_completed': stats.total_quizzes,
                'total_correct': stats.total_correct,
                'total_answered': stats.total_questions_answered,
            }
        except PlayerStats.DoesNotExist:
            stats_data = {}

        return Response({
            'student': {
                'id': student.id,
                'username': student.username,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'email': student.email,
                'gender': student.gender,
                'bio': student.bio,
                'interests': student.interests,
                'date_joined': student.date_joined,
            },
            'stats': stats_data,
            'recent_quizzes': session_data,
        })
