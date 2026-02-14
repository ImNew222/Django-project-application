from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Avg, Count, Q
from django.utils import timezone

from .models import Section, SectionMembership, SectionAssignment


class IsTeacherOrAdmin(permissions.BasePermission):
    """Only teachers and admins."""
    def has_permission(self, request, view):
        return request.user.role in ['teacher', 'admin']


def _serialize_section(s, user=None):
    """Serialize a Section for the API."""
    memberships = s.memberships.select_related('student').all()
    is_member = user and any(m.student_id == user.id for m in memberships)
    return {
        'id': s.id,
        'display_name': s.display_name,
        'program': s.program,
        'year_level': s.year_level,
        'section_num': s.section_num,
        'description': s.description,
        'teacher': s.teacher.username,
        'teacher_id': s.teacher.id,
        'join_code': s.join_code if (user and (s.teacher == user or user.role == 'admin')) else None,
        'member_count': len(memberships),
        'is_active': s.is_active,
        'is_teacher': user and s.teacher == user,
        'is_member': is_member,
        'created_at': s.created_at.isoformat(),
        'members': [{
            'id': m.student.id,
            'username': m.student.username,
            'first_name': m.student.first_name,
            'last_name': m.student.last_name,
            'joined_at': m.joined_at.isoformat(),
        } for m in memberships],
    }


# ── Section CRUD ─────────────────────────────────────────────

class SectionListCreateView(APIView):
    """GET: list sections. POST: create section (teacher only)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role in ['teacher', 'admin']:
            # Teachers see their own sections
            sections = Section.objects.filter(teacher=user, is_active=True)\
                .select_related('teacher')
        else:
            # Students see sections they belong to
            section_ids = SectionMembership.objects.filter(
                student=user
            ).values_list('section_id', flat=True)
            sections = Section.objects.filter(
                id__in=section_ids, is_active=True
            ).select_related('teacher')

        return Response([_serialize_section(s, user) for s in sections])

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return Response({'error': 'Only teachers can create sections'},
                            status=status.HTTP_403_FORBIDDEN)

        program = request.data.get('program', 'BSIT')
        year_level = int(request.data.get('year_level', 1))
        section_num = int(request.data.get('section_num', 1))
        description = request.data.get('description', '')

        if year_level not in range(1, 5):
            return Response({'error': 'Year level must be 1-4'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Check duplicate
        if Section.objects.filter(
            teacher=request.user, program=program,
            year_level=year_level, section_num=section_num
        ).exists():
            return Response({'error': 'Section already exists'},
                            status=status.HTTP_400_BAD_REQUEST)

        section = Section.objects.create(
            teacher=request.user,
            program=program,
            year_level=year_level,
            section_num=section_num,
            description=description,
        )
        return Response(_serialize_section(section, request.user),
                        status=status.HTTP_201_CREATED)


class SectionDetailView(APIView):
    """GET: section detail with members and assignments."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            s = Section.objects.select_related('teacher').get(pk=pk, is_active=True)
        except Section.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check access
        is_teacher = s.teacher == request.user
        is_member = SectionMembership.objects.filter(
            section=s, student=request.user
        ).exists()
        if not (is_teacher or is_member or request.user.role == 'admin'):
            return Response({'error': 'Not a member'}, status=status.HTTP_403_FORBIDDEN)

        data = _serialize_section(s, request.user)

        # Add assignments
        assignments = s.assignments.select_related('subject', 'tournament', 'challenge').all()
        data['assignments'] = [{
            'id': a.id,
            'type': a.assignment_type,
            'title': a.title,
            'description': a.description,
            'subject': a.subject.name if a.subject else None,
            'difficulty': a.difficulty,
            'num_questions': a.num_questions,
            'tournament_id': a.tournament_id,
            'challenge_id': a.challenge_id,
            'challenge_title': a.challenge.title if a.challenge else None,
            'due_date': a.due_date.isoformat() if a.due_date else None,
            'created_at': a.created_at.isoformat(),
        } for a in assignments]

        return Response(data)

    def delete(self, request, pk):
        """Teacher deactivates a section."""
        try:
            s = Section.objects.get(pk=pk)
        except Section.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if s.teacher != request.user and request.user.role != 'admin':
            return Response({'error': 'Only the teacher can delete'},
                            status=status.HTTP_403_FORBIDDEN)

        s.is_active = False
        s.save()
        return Response({'status': 'deleted'})


class SectionJoinView(APIView):
    """POST: student joins a section by join code."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        join_code = request.data.get('join_code', '').strip().upper()
        if not join_code or len(join_code) != 6:
            return Response({'error': 'Enter a 6-character join code'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            section = Section.objects.get(join_code=join_code, is_active=True)
        except Section.DoesNotExist:
            return Response({'error': 'Section not found with that code'},
                            status=status.HTTP_404_NOT_FOUND)

        if SectionMembership.objects.filter(
            section=section, student=request.user
        ).exists():
            return Response({'error': 'Already a member'},
                            status=status.HTTP_400_BAD_REQUEST)

        SectionMembership.objects.create(section=section, student=request.user)
        return Response(_serialize_section(section, request.user))


class SectionLeaveView(APIView):
    """POST: student leaves a section."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        membership = SectionMembership.objects.filter(
            section_id=pk, student=request.user
        ).first()
        if not membership:
            return Response({'error': 'Not a member'},
                            status=status.HTTP_400_BAD_REQUEST)
        membership.delete()
        return Response({'status': 'left'})


class SectionStudentsView(APIView):
    """GET: teacher views student progress within a section."""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request, pk):
        try:
            section = Section.objects.get(pk=pk)
        except Section.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if section.teacher != request.user and request.user.role != 'admin':
            return Response({'error': 'Not your section'},
                            status=status.HTTP_403_FORBIDDEN)

        memberships = section.memberships.select_related('student').all()
        students = []

        for m in memberships:
            user = m.student
            # Get player stats
            try:
                from leaderboard.models import PlayerStats
                stats = PlayerStats.objects.get(user=user)
                xp = stats.rank_points
                streak = stats.daily_streak
            except Exception:
                xp = 0
                streak = 0

            # Quiz stats
            from quiz.models import QuizSession
            quiz_sessions = QuizSession.objects.filter(user=user, is_completed=True)
            total_quizzes = quiz_sessions.count()
            avg_score = 0
            if total_quizzes > 0:
                avg_data = quiz_sessions.aggregate(
                    avg_pct=Avg('score') * 100 / Avg('total_questions')
                )
                try:
                    total_score = sum(qs.score for qs in quiz_sessions)
                    total_q = sum(qs.total_questions for qs in quiz_sessions)
                    avg_score = round((total_score / total_q) * 100, 1) if total_q else 0
                except Exception:
                    avg_score = 0

            students.append({
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'joined_at': m.joined_at.isoformat(),
                'xp': xp,
                'streak': streak,
                'total_quizzes': total_quizzes,
                'avg_score': avg_score,
            })

        return Response({
            'section': _serialize_section(section, request.user),
            'students': students,
        })


# ── Assignments ──────────────────────────────────────────────

class AssignmentCreateView(APIView):
    """POST: teacher creates an assignment for a section."""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request, pk):
        try:
            section = Section.objects.get(pk=pk)
        except Section.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if section.teacher != request.user and request.user.role != 'admin':
            return Response({'error': 'Not your section'},
                            status=status.HTTP_403_FORBIDDEN)

        a_type = request.data.get('assignment_type', 'quiz')
        title = request.data.get('title', '').strip()
        if not title:
            return Response({'error': 'Title required'},
                            status=status.HTTP_400_BAD_REQUEST)

        assignment = SectionAssignment.objects.create(
            section=section,
            assigned_by=request.user,
            assignment_type=a_type,
            title=title,
            description=request.data.get('description', ''),
            difficulty=request.data.get('difficulty', 'beginner'),
            num_questions=int(request.data.get('num_questions', 10)),
            due_date=request.data.get('due_date') or None,
        )

        # Link subject if quiz
        subject_id = request.data.get('subject_id')
        if subject_id:
            try:
                from quiz.models import Subject
                assignment.subject = Subject.objects.get(id=subject_id)
                assignment.save()
            except Exception:
                pass

        # Link challenge if code challenge
        challenge_id = request.data.get('challenge_id')
        if challenge_id:
            try:
                from compiler.models import CodeChallenge
                assignment.challenge = CodeChallenge.objects.get(id=challenge_id)
                assignment.save()
            except Exception:
                pass

        return Response({
            'id': assignment.id,
            'title': assignment.title,
            'type': assignment.assignment_type,
        }, status=status.HTTP_201_CREATED)


class SectionAssignmentListView(APIView):
    """GET: list assignments for a section."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            section = Section.objects.get(pk=pk, is_active=True)
        except Section.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check access
        is_teacher = section.teacher == request.user
        is_member = SectionMembership.objects.filter(
            section=section, student=request.user
        ).exists()
        if not (is_teacher or is_member or request.user.role == 'admin'):
            return Response({'error': 'Not a member'}, status=status.HTTP_403_FORBIDDEN)

        assignments = section.assignments.select_related(
            'subject', 'challenge'
        ).all()

        return Response([{
            'id': a.id,
            'type': a.assignment_type,
            'title': a.title,
            'description': a.description,
            'subject': a.subject.name if a.subject else None,
            'difficulty': a.difficulty,
            'num_questions': a.num_questions,
            'challenge_id': a.challenge_id,
            'challenge_title': a.challenge.title if a.challenge else None,
            'due_date': a.due_date.isoformat() if a.due_date else None,
            'created_at': a.created_at.isoformat(),
            'is_overdue': a.due_date and timezone.now() > a.due_date,
        } for a in assignments])
