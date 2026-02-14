from rest_framework import serializers
from .models import CodeSubmission, CodeChallenge, TestCase, BattleSession, BattleSubmission


class RunCodeSerializer(serializers.Serializer):
    """Input for running code."""
    language_id = serializers.IntegerField()
    language_name = serializers.CharField(max_length=50, default="Python")
    source_code = serializers.CharField()
    stdin = serializers.CharField(required=False, default='', allow_blank=True)


class CodeSubmissionSerializer(serializers.ModelSerializer):
    """Output for code submissions."""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CodeSubmission
        fields = [
            'id', 'username', 'language_id', 'language_name',
            'source_code', 'stdin', 'stdout', 'stderr', 'compile_output',
            'status', 'status_description',
            'execution_time', 'memory_used',
            'judge0_token', 'created_at',
        ]
        read_only_fields = fields


# ============================================================
# Code Battle Serializers
# ============================================================

class TestCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = ['id', 'input_data', 'expected_output', 'is_sample', 'order']


class ChallengeListSerializer(serializers.ModelSerializer):
    """Summary view for challenge browser."""
    points = serializers.IntegerField(read_only=True)
    test_count = serializers.SerializerMethodField()
    solved_by = serializers.SerializerMethodField()

    class Meta:
        model = CodeChallenge
        fields = [
            'id', 'slug', 'title', 'difficulty', 'points',
            'time_limit_minutes', 'test_count', 'solved_by',
        ]

    def get_test_count(self, obj):
        return obj.test_cases.count()

    def get_solved_by(self, obj):
        return BattleSession.objects.filter(
            challenge=obj, status='completed'
        ).values('user').distinct().count()


class ChallengeDetailSerializer(serializers.ModelSerializer):
    """Full challenge view with sample test cases."""
    points = serializers.IntegerField(read_only=True)
    sample_tests = serializers.SerializerMethodField()
    total_tests = serializers.SerializerMethodField()
    user_status = serializers.SerializerMethodField()

    class Meta:
        model = CodeChallenge
        fields = [
            'id', 'slug', 'title', 'description', 'difficulty', 'points',
            'time_limit_minutes', 'hint',
            'starter_python', 'starter_javascript', 'starter_cpp', 'starter_java',
            'sample_tests', 'total_tests', 'user_status',
        ]

    def get_sample_tests(self, obj):
        samples = obj.test_cases.filter(is_sample=True)
        return TestCaseSerializer(samples, many=True).data

    def get_total_tests(self, obj):
        return obj.test_cases.count()

    def get_user_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        session = BattleSession.objects.filter(
            user=request.user, challenge=obj
        ).first()
        if session:
            return {
                'status': session.status,
                'attempts': session.attempts_count,
                'points_earned': session.points_earned,
            }
        return None


class BattleSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BattleSubmission
        fields = [
            'id', 'source_code', 'language_id', 'language_name',
            'passed_tests', 'total_tests', 'all_passed',
            'execution_time', 'test_results', 'created_at',
        ]
        read_only_fields = fields


class BattleSessionSerializer(serializers.ModelSerializer):
    challenge_title = serializers.CharField(source='challenge.title', read_only=True)
    challenge_slug = serializers.CharField(source='challenge.slug', read_only=True)
    challenge_difficulty = serializers.CharField(source='challenge.difficulty', read_only=True)
    best_submission = serializers.SerializerMethodField()

    class Meta:
        model = BattleSession
        fields = [
            'id', 'challenge_title', 'challenge_slug', 'challenge_difficulty',
            'status', 'attempts_count', 'points_earned',
            'started_at', 'completed_at', 'best_submission',
        ]

    def get_best_submission(self, obj):
        best = obj.submissions.order_by('-passed_tests', '-created_at').first()
        if best:
            return {
                'passed_tests': best.passed_tests,
                'total_tests': best.total_tests,
                'all_passed': best.all_passed,
            }
        return None

