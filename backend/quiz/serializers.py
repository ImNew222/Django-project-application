from rest_framework import serializers
from .models import Subject, Question, QuizSession, QuizAnswer


class SubjectSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ['id', 'name', 'description', 'icon', 'question_count']

    def get_question_count(self, obj):
        return obj.questions.count()


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for questions — hides correct answer from students."""
    choices = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ['id', 'text', 'difficulty', 'choices']

    def get_choices(self, obj):
        # Return choices without revealing which is correct
        return [
            {'key': 'A', 'text': obj.choice_a},
            {'key': 'B', 'text': obj.choice_b},
            {'key': 'C', 'text': obj.choice_c},
            {'key': 'D', 'text': obj.choice_d},
        ]


class QuestionResultSerializer(serializers.ModelSerializer):
    """Serializer for questions WITH correct answer — shown in results."""
    class Meta:
        model = Question
        fields = ['id', 'text', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'correct_answer']


class StartQuizSerializer(serializers.Serializer):
    """Serializer for starting a new quiz."""
    subject_id = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['beginner', 'intermediate', 'hard'])
    num_questions = serializers.IntegerField(default=10, min_value=5, max_value=20)


class SubmitAnswerSerializer(serializers.Serializer):
    """Serializer for submitting an answer."""
    session_id = serializers.IntegerField()
    question_id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=1)
    time_spent = serializers.FloatField(min_value=0)


class QuizAnswerSerializer(serializers.ModelSerializer):
    question = QuestionResultSerializer()

    class Meta:
        model = QuizAnswer
        fields = ['question', 'selected_answer', 'is_correct', 'time_spent']


class QuizSessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    percentage = serializers.ReadOnlyField()

    class Meta:
        model = QuizSession
        fields = [
            'id', 'username', 'subject_name', 'difficulty', 'score',
            'total_questions', 'percentage', 'started_at', 'completed_at',
            'is_completed', 'tab_switches'
        ]


class QuizSessionDetailSerializer(QuizSessionSerializer):
    answers = QuizAnswerSerializer(many=True, read_only=True)

    class Meta(QuizSessionSerializer.Meta):
        fields = QuizSessionSerializer.Meta.fields + ['answers']
