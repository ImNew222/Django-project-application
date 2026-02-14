from rest_framework import serializers
from .models import TypingText, TypingResult


class TypingTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypingText
        fields = ['id', 'title', 'content', 'difficulty', 'word_count']


class TypingResultSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    text_title = serializers.CharField(source='text.title', read_only=True)

    class Meta:
        model = TypingResult
        fields = ['id', 'username', 'text_title', 'wpm', 'accuracy', 'time_taken', 'errors', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubmitTypingResultSerializer(serializers.Serializer):
    text_id = serializers.IntegerField()
    wpm = serializers.FloatField()
    accuracy = serializers.FloatField()
    time_taken = serializers.FloatField()
    errors = serializers.IntegerField()
