from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import TypingText, TypingResult
from .serializers import TypingTextSerializer, TypingResultSerializer, SubmitTypingResultSerializer


class TypingTextListView(generics.ListAPIView):
    """Get all typing texts. Filter by difficulty with ?difficulty=easy|medium|hard"""
    serializer_class = TypingTextSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TypingText.objects.all()
        difficulty = self.request.query_params.get('difficulty')
        if difficulty in ['easy', 'medium', 'hard']:
            qs = qs.filter(difficulty=difficulty)
        return qs


class RandomTextView(APIView):
    """Get a random typing text. Optional ?difficulty= filter."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = TypingText.objects.all()
        difficulty = request.query_params.get('difficulty')
        if difficulty in ['easy', 'medium', 'hard']:
            qs = qs.filter(difficulty=difficulty)

        text = qs.order_by('?').first()
        if not text:
            return Response({'error': 'No typing texts available.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(TypingTextSerializer(text).data)


class SubmitResultView(APIView):
    """Submit a typing result after completing a test."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SubmitTypingResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            text = TypingText.objects.get(id=serializer.validated_data['text_id'])
        except TypingText.DoesNotExist:
            return Response({'error': 'Text not found.'}, status=status.HTTP_404_NOT_FOUND)

        result = TypingResult.objects.create(
            user=request.user,
            text=text,
            wpm=serializer.validated_data['wpm'],
            accuracy=serializer.validated_data['accuracy'],
            time_taken=serializer.validated_data['time_taken'],
            errors=serializer.validated_data['errors'],
        )

        # Get user's best WPM
        best = TypingResult.objects.filter(user=request.user).order_by('-wpm').first()

        return Response({
            'result': TypingResultSerializer(result).data,
            'personal_best_wpm': best.wpm if best else result.wpm,
            'is_new_record': result.wpm >= (best.wpm if best else 0),
        }, status=status.HTTP_201_CREATED)


class TypingLeaderboardView(generics.ListAPIView):
    """Typing speed leaderboard — top 50 best WPM results."""
    serializer_class = TypingResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TypingResult.objects.select_related('user', 'text').order_by('-wpm')[:50]


class MyTypingHistoryView(generics.ListAPIView):
    """Current user's typing history."""
    serializer_class = TypingResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TypingResult.objects.filter(user=self.request.user).select_related('text').order_by('-created_at')[:20]
