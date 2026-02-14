from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Subject, Question, QuizSession, QuizAnswer
from .serializers import (
    SubjectSerializer, QuestionSerializer, StartQuizSerializer,
    SubmitAnswerSerializer, QuizSessionSerializer, QuizSessionDetailSerializer,
)
from leaderboard.models import PlayerStats


class SubjectListView(generics.ListAPIView):
    """List all available quiz subjects."""
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]


class StartQuizView(APIView):
    """Start a new quiz session."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StartQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subject_id = serializer.validated_data['subject_id']
        difficulty = serializer.validated_data['difficulty']
        num_questions = serializer.validated_data.get('num_questions', 10)

        # Get subject
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Get random questions for this subject and difficulty
        questions = list(
            Question.objects.filter(subject=subject, difficulty=difficulty)
            .order_by('?')[:num_questions]
        )

        if len(questions) < 3:
            return Response(
                {'error': f'Not enough questions for {subject.name} ({difficulty}). Need at least 3.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create quiz session
        session = QuizSession.objects.create(
            user=request.user,
            subject=subject,
            difficulty=difficulty,
            total_questions=len(questions),
        )

        # Serialize questions (without correct answers!)
        question_data = QuestionSerializer(questions, many=True).data

        return Response({
            'session_id': session.id,
            'subject': subject.name,
            'difficulty': difficulty,
            'total_questions': len(questions),
            'time_limit_per_question': session.time_limit_per_question,
            'questions': question_data,
        }, status=status.HTTP_201_CREATED)


class SubmitAnswerView(APIView):
    """Submit an answer for a question in an active quiz session."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data['session_id']
        question_id = serializer.validated_data['question_id']
        selected = serializer.validated_data['selected_answer'].upper()
        time_spent = serializer.validated_data['time_spent']

        # Validate session
        try:
            session = QuizSession.objects.get(id=session_id, user=request.user)
        except QuizSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if session.is_completed:
            return Response({'error': 'Quiz already completed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate question
        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if already answered
        if QuizAnswer.objects.filter(session=session, question=question).exists():
            return Response({'error': 'Question already answered.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check answer
        is_correct = selected == question.correct_answer

        # Save answer
        QuizAnswer.objects.create(
            session=session,
            question=question,
            selected_answer=selected,
            is_correct=is_correct,
            time_spent=time_spent,
        )

        # Update session score
        if is_correct:
            session.score += 1
            session.save()

        return Response({
            'is_correct': is_correct,
            'correct_answer': question.correct_answer,
            'current_score': session.score,
        })


class CompleteQuizView(APIView):
    """Mark a quiz session as completed and update leaderboard."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = QuizSession.objects.get(id=session_id, user=request.user)
        except QuizSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if session.is_completed:
            return Response({'error': 'Quiz already completed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update tab switches from frontend
        tab_switches = request.data.get('tab_switches', 0)
        session.tab_switches = tab_switches
        session.is_completed = True
        session.completed_at = timezone.now()
        session.save()

        # Update player stats / leaderboard
        stats, created = PlayerStats.objects.get_or_create(user=request.user)

        # Bonus points for difficulty
        difficulty_multiplier = {'beginner': 1, 'intermediate': 1.5, 'hard': 2}
        multiplier = difficulty_multiplier.get(session.difficulty, 1)

        # Calculate points
        base_points = session.score * 10
        bonus_points = int(base_points * multiplier)

        stats.total_quizzes += 1
        stats.total_correct += session.score
        stats.total_questions_answered += session.total_questions
        stats.total_score += session.score
        stats.rank_points += bonus_points

        # Streak logic
        percentage = session.percentage
        if percentage >= 70:
            stats.current_streak += 1
            if stats.current_streak > stats.best_streak:
                stats.best_streak = stats.current_streak
        else:
            stats.current_streak = 0

        stats.save()

        # Return detailed results
        detail_serializer = QuizSessionDetailSerializer(session)
        return Response({
            'session': detail_serializer.data,
            'points_earned': bonus_points,
            'new_rank_points': stats.rank_points,
            'streak': stats.current_streak,
        })


class ReportTabSwitchView(APIView):
    """Anti-cheat: Report a tab switch during quiz."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = QuizSession.objects.get(id=session_id, user=request.user)
        except QuizSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        session.tab_switches += 1
        session.save()
        return Response({'tab_switches': session.tab_switches})


class QuizHistoryView(generics.ListAPIView):
    """Get user's quiz history."""
    serializer_class = QuizSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return QuizSession.objects.filter(user=self.request.user, is_completed=True)


class QuizSessionDetailView(generics.RetrieveAPIView):
    """Get detailed results of a completed quiz session."""
    serializer_class = QuizSessionDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return QuizSession.objects.filter(user=self.request.user)
