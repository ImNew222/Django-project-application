import base64
import datetime
import requests
from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.db import models
from django.utils import timezone
from .models import (
    CodeSubmission, CodeChallenge, TestCase, BattleSession, BattleSubmission,
    DailyChallenge, DailySubmission, Tournament, TournamentParticipant, TournamentMatch,
    PvPBattle, PvPSubmission, TowerDefenseScore,
)
from .serializers import (
    RunCodeSerializer, CodeSubmissionSerializer,
    ChallengeListSerializer, ChallengeDetailSerializer,
    BattleSessionSerializer, BattleSubmissionSerializer,
)

JUDGE0_URL = getattr(settings, 'JUDGE0_API_URL', 'http://localhost:2358')

# Supported languages (Judge0 CE language IDs)
SUPPORTED_LANGUAGES = [
    {'id': 71, 'name': 'Python (3.8.1)'},
    {'id': 62, 'name': 'Java (OpenJDK 13.0.1)'},
    {'id': 54, 'name': 'C++ (GCC 9.2.0)'},
    {'id': 63, 'name': 'JavaScript (Node.js 12.14.0)'},
    {'id': 50, 'name': 'C (GCC 9.2.0)'},
    {'id': 51, 'name': 'C# (Mono 6.6.0.161)'},
    {'id': 72, 'name': 'Ruby (2.7.0)'},
    {'id': 68, 'name': 'PHP (7.4.1)'},
    {'id': 73, 'name': 'Rust (1.40.0)'},
    {'id': 60, 'name': 'Go (1.13.5)'},
    {'id': 78, 'name': 'Kotlin (1.3.70)'},
    {'id': 74, 'name': 'TypeScript (3.7.4)'},
]

# Map Judge0 status IDs to our status strings
STATUS_MAP = {
    1: 'pending',        # In Queue
    2: 'running',        # Processing
    3: 'accepted',       # Accepted
    4: 'wrong_answer',   # Wrong Answer
    5: 'time_limit',     # Time Limit Exceeded
    6: 'compilation_error',
    7: 'runtime_error',  # Runtime Error (SIGSEGV)
    8: 'runtime_error',  # Runtime Error (SIGXFSZ)
    9: 'runtime_error',  # Runtime Error (SIGFPE)
    10: 'runtime_error', # Runtime Error (SIGABRT)
    11: 'runtime_error', # Runtime Error (NZEC)
    12: 'runtime_error', # Runtime Error (Other)
    13: 'compilation_error', # Internal Error
    14: 'runtime_error', # Exec Format Error
}


def decode_base64(value):
    """Decode base64 string from Judge0 response."""
    if not value:
        return ''
    try:
        return base64.b64decode(value).decode('utf-8', errors='replace')
    except Exception:
        return value


def run_judge0(source_code, language_id, stdin=''):
    """Run code through Judge0 and return the result dict."""
    payload = {
        'language_id': language_id,
        'source_code': base64.b64encode(source_code.encode()).decode(),
        'stdin': base64.b64encode(stdin.encode()).decode(),
        'base64_encoded': True,
    }
    resp = requests.post(
        f'{JUDGE0_URL}/submissions?base64_encoded=true&wait=true',
        json=payload,
        headers={'Content-Type': 'application/json'},
        timeout=30,
    )
    if resp.status_code in (200, 201):
        result = resp.json()
        return {
            'stdout': decode_base64(result.get('stdout', '')).strip(),
            'stderr': decode_base64(result.get('stderr', '')),
            'compile_output': decode_base64(result.get('compile_output', '')),
            'time': result.get('time'),
            'memory': result.get('memory'),
            'status_id': result.get('status', {}).get('id', 0),
            'status_desc': result.get('status', {}).get('description', ''),
        }
    return {'stdout': '', 'stderr': f'Judge0 HTTP {resp.status_code}', 'status_id': 13}


# ============================================================
# Phase 1 — Compiler Views (unchanged)
# ============================================================

class LanguagesView(APIView):
    """Return list of supported programming languages."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(SUPPORTED_LANGUAGES)


class SubmitCodeView(APIView):
    """Submit code to Judge0 for execution."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RunCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create submission record
        submission = CodeSubmission.objects.create(
            user=request.user,
            language_id=data['language_id'],
            language_name=data.get('language_name', 'Unknown'),
            source_code=data['source_code'],
            stdin=data.get('stdin', ''),
            status='pending',
        )

        # Send to Judge0 (wait for result with ?wait=true for simplicity)
        try:
            judge0_payload = {
                'language_id': data['language_id'],
                'source_code': base64.b64encode(data['source_code'].encode()).decode(),
                'stdin': base64.b64encode(data.get('stdin', '').encode()).decode(),
                'base64_encoded': True,
            }

            resp = requests.post(
                f'{JUDGE0_URL}/submissions?base64_encoded=true&wait=true',
                json=judge0_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30,
            )

            if resp.status_code in (200, 201):
                result = resp.json()
                # Decode base64 fields
                submission.stdout = decode_base64(result.get('stdout'))
                submission.stderr = decode_base64(result.get('stderr'))
                submission.compile_output = decode_base64(result.get('compile_output'))
                submission.execution_time = result.get('time')
                submission.memory_used = result.get('memory')
                submission.judge0_token = result.get('token', '')

                # Map Judge0 status
                j0_status = result.get('status', {})
                status_id = j0_status.get('id', 0)
                submission.status = STATUS_MAP.get(status_id, 'runtime_error')
                submission.status_description = j0_status.get('description', '')
                submission.save()

                return Response(
                    CodeSubmissionSerializer(submission).data,
                    status=status.HTTP_201_CREATED,
                )
            else:
                submission.status = 'runtime_error'
                submission.stderr = f'Judge0 returned HTTP {resp.status_code}: {resp.text[:500]}'
                submission.save()
                return Response(
                    CodeSubmissionSerializer(submission).data,
                    status=status.HTTP_201_CREATED,
                )

        except requests.exceptions.ConnectionError:
            submission.status = 'runtime_error'
            submission.stderr = 'Could not connect to Judge0. Make sure Docker containers are running.'
            submission.save()
            return Response(
                CodeSubmissionSerializer(submission).data,
                status=status.HTTP_201_CREATED,
            )

        except requests.exceptions.Timeout:
            submission.status = 'time_limit'
            submission.stderr = 'Execution timed out (30s limit).'
            submission.save()
            return Response(
                CodeSubmissionSerializer(submission).data,
                status=status.HTTP_201_CREATED,
            )


class SubmissionDetailView(APIView):
    """Get a single submission by ID."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            sub = CodeSubmission.objects.get(pk=pk, user=request.user)
        except CodeSubmission.DoesNotExist:
            return Response({'error': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CodeSubmissionSerializer(sub).data)


class MySubmissionsView(generics.ListAPIView):
    """Current user's recent code submissions."""
    serializer_class = CodeSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CodeSubmission.objects.filter(
            user=self.request.user
        ).order_by('-created_at')[:30]


# ============================================================
# Phase 2 — Code Battle Views
# ============================================================

class ChallengeListView(generics.ListAPIView):
    """Browse coding challenges, optionally filter by difficulty."""
    serializer_class = ChallengeListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CodeChallenge.objects.filter(is_active=True)
        diff = self.request.query_params.get('difficulty')
        if diff in ('easy', 'medium', 'hard'):
            qs = qs.filter(difficulty=diff)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Add solved status per challenge for the current user
        solved_ids = set(
            BattleSession.objects.filter(
                user=request.user, status='completed'
            ).values_list('challenge_id', flat=True)
        )
        for item in response.data:
            item['is_solved'] = item['id'] in solved_ids
        return response


class ChallengeDetailView(APIView):
    """Full challenge details with sample test cases."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        try:
            challenge = CodeChallenge.objects.get(slug=slug, is_active=True)
        except CodeChallenge.DoesNotExist:
            return Response({'error': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ChallengeDetailSerializer(challenge, context={'request': request})
        return Response(serializer.data)


class StartBattleView(APIView):
    """Start a new battle session for a challenge."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        slug = request.data.get('challenge_slug')
        if not slug:
            return Response({'error': 'challenge_slug is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge = CodeChallenge.objects.get(slug=slug, is_active=True)
        except CodeChallenge.DoesNotExist:
            return Response({'error': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check for existing in-progress session
        existing = BattleSession.objects.filter(
            user=request.user, challenge=challenge, status='in_progress'
        ).first()
        if existing:
            return Response(BattleSessionSerializer(existing).data, status=status.HTTP_200_OK)

        # Create new session
        session = BattleSession.objects.create(
            user=request.user,
            challenge=challenge,
        )
        return Response(BattleSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class SubmitBattleSolutionView(APIView):
    """Submit code for a battle — runs against all test cases."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = BattleSession.objects.get(id=session_id, user=request.user)
        except BattleSession.DoesNotExist:
            return Response({'error': 'Battle session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if session.status == 'completed':
            return Response({'error': 'Battle already completed.'}, status=status.HTTP_400_BAD_REQUEST)

        source_code = request.data.get('source_code', '')
        language_id = request.data.get('language_id', 71)
        language_name = request.data.get('language_name', 'Python')

        if not source_code.strip():
            return Response({'error': 'Source code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        test_cases = session.challenge.test_cases.all()
        total = test_cases.count()
        passed = 0
        test_results = []
        total_time = 0.0

        for tc in test_cases:
            try:
                result = run_judge0(source_code, language_id, tc.input_data)
                actual_output = result.get('stdout', '').strip()
                expected = tc.expected_output.strip()
                is_pass = (actual_output == expected) and result.get('status_id') == 3

                if is_pass:
                    passed += 1

                exec_time = float(result.get('time') or 0)
                total_time += exec_time

                test_result = {
                    'test_id': tc.id,
                    'is_sample': tc.is_sample,
                    'passed': is_pass,
                    'execution_time': exec_time,
                    'status': result.get('status_desc', ''),
                }

                # Show input/expected/actual for sample tests; only pass/fail for hidden
                if tc.is_sample:
                    test_result['input'] = tc.input_data
                    test_result['expected'] = expected
                    test_result['actual'] = actual_output
                    if result.get('stderr'):
                        test_result['stderr'] = result['stderr'][:300]
                    if result.get('compile_output'):
                        test_result['compile_output'] = result['compile_output'][:300]
                else:
                    test_result['input'] = None
                    test_result['expected'] = None
                    test_result['actual'] = None

                test_results.append(test_result)

            except Exception as e:
                test_results.append({
                    'test_id': tc.id,
                    'is_sample': tc.is_sample,
                    'passed': False,
                    'error': str(e)[:200],
                })

        all_passed = passed == total

        # Save battle submission
        session.attempts_count += 1
        battle_sub = BattleSubmission.objects.create(
            session=session,
            source_code=source_code,
            language_id=language_id,
            language_name=language_name,
            passed_tests=passed,
            total_tests=total,
            all_passed=all_passed,
            execution_time=round(total_time, 3),
            test_results=test_results,
        )

        # If all passed, mark as completed and award points
        points_earned = 0
        if all_passed:
            session.status = 'completed'
            session.completed_at = timezone.now()
            points_earned = session.challenge.points
            session.points_earned = points_earned

            # Update leaderboard
            try:
                from leaderboard.models import PlayerStats
                stats, _ = PlayerStats.objects.get_or_create(user=request.user)
                stats.rank_points += points_earned
                stats.save()
            except Exception:
                pass  # Leaderboard update is best-effort

        session.save()

        return Response({
            'submission': BattleSubmissionSerializer(battle_sub).data,
            'session_status': session.status,
            'attempts': session.attempts_count,
            'points_earned': points_earned,
        })


class BattleResultView(APIView):
    """Get battle session details and submissions."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = BattleSession.objects.get(id=session_id, user=request.user)
        except BattleSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        subs = session.submissions.all()
        return Response({
            'session': BattleSessionSerializer(session).data,
            'submissions': BattleSubmissionSerializer(subs, many=True).data,
        })


class BattleHistoryView(generics.ListAPIView):
    """User's past battle sessions."""
    serializer_class = BattleSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BattleSession.objects.filter(user=self.request.user)


# ============================================================
# Phase 4 — Daily Challenges
# ============================================================

class TodaysChallengeView(APIView):
    """Get today's daily challenge."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        daily = DailyChallenge.get_or_create_today()
        if not daily:
            return Response({'error': 'No challenges available'}, status=status.HTTP_404_NOT_FOUND)

        challenge = daily.challenge
        sample_tests = list(challenge.test_cases.filter(is_sample=True).values(
            'id', 'input_data', 'expected_output', 'is_sample'
        ))

        # Check if user already submitted
        submission = DailySubmission.objects.filter(user=request.user, daily=daily).first()

        # User streak info
        from leaderboard.models import PlayerStats
        stats, _ = PlayerStats.objects.get_or_create(user=request.user)

        return Response({
            'date': str(daily.date),
            'difficulty': daily.difficulty,
            'challenge': {
                'id': challenge.id,
                'slug': challenge.slug,
                'title': challenge.title,
                'description': challenge.description,
                'difficulty': challenge.difficulty,
                'points': challenge.points,
                'time_limit_minutes': challenge.time_limit_minutes,
                'hint': challenge.hint,
                'starter_python': challenge.starter_python,
                'starter_javascript': challenge.starter_javascript,
                'starter_cpp': challenge.starter_cpp,
                'starter_java': challenge.starter_java,
                'sample_tests': sample_tests,
                'test_count': challenge.test_cases.count(),
            },
            'submission': {
                'solved': submission.solved if submission else False,
                'attempts': submission.attempts if submission else 0,
                'solve_time': submission.solve_time if submission else None,
            },
            'streak': {
                'current': stats.daily_streak,
                'best': stats.best_daily_streak,
                'multiplier': 2.0 if stats.daily_streak >= 30 else (1.5 if stats.daily_streak >= 7 else 1.0),
            },
        })


class DailySubmitView(APIView):
    """Submit a solution for today's daily challenge."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        daily = DailyChallenge.get_or_create_today()
        if not daily:
            return Response({'error': 'No daily challenge'}, status=status.HTTP_404_NOT_FOUND)

        source_code = request.data.get('source_code', '')
        language_id = request.data.get('language_id', 71)

        if not source_code.strip():
            return Response({'error': 'Empty code'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create submission
        submission, _ = DailySubmission.objects.get_or_create(
            user=request.user, daily=daily
        )

        if submission.solved:
            return Response({'error': 'Already solved today!'}, status=status.HTTP_400_BAD_REQUEST)

        submission.attempts += 1

        # Run against all test cases
        test_cases = list(daily.challenge.test_cases.all())
        passed = 0
        total = len(test_cases)
        test_results = []
        total_time = 0.0

        for tc in test_cases:
            result = run_judge0(source_code, language_id, tc.input_data)
            actual = result.get('stdout', '').strip()
            expected = tc.expected_output.strip()
            is_pass = (actual == expected) and result.get('status_id') == 3
            if is_pass:
                passed += 1
            exec_time = float(result.get('time') or 0)
            total_time += exec_time

            tr = {
                'passed': is_pass,
                'is_sample': tc.is_sample,
                'execution_time': exec_time,
            }
            if tc.is_sample:
                tr['input'] = tc.input_data
                tr['expected'] = expected
                tr['actual'] = actual
                if result.get('stderr'):
                    tr['stderr'] = result['stderr'][:200]
            test_results.append(tr)

        all_passed = passed == total

        # Update submission
        points_earned = 0
        if all_passed:
            submission.solved = True
            submission.solve_time = total_time

            # Update daily streak
            from leaderboard.models import PlayerStats
            import datetime
            stats, _ = PlayerStats.objects.get_or_create(user=request.user)
            today = timezone.now().date()
            yesterday = today - datetime.timedelta(days=1)

            if stats.last_daily_completed == yesterday:
                stats.daily_streak += 1
            elif stats.last_daily_completed != today:
                stats.daily_streak = 1

            if stats.daily_streak > stats.best_daily_streak:
                stats.best_daily_streak = stats.daily_streak

            stats.last_daily_completed = today

            # Streak multiplier
            multiplier = 2.0 if stats.daily_streak >= 30 else (1.5 if stats.daily_streak >= 7 else 1.0)
            base_points = daily.challenge.points
            points_earned = int(base_points * multiplier)
            stats.rank_points += points_earned
            stats.save()

        submission.save()

        return Response({
            'passed': passed,
            'total': total,
            'all_passed': all_passed,
            'test_results': test_results,
            'execution_time': round(total_time, 3),
            'attempts': submission.attempts,
            'points_earned': points_earned,
            'streak': stats.daily_streak if all_passed else None,
        })


class DailyLeaderboardView(APIView):
    """Today's fastest daily solvers."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        daily = DailyChallenge.get_or_create_today()
        if not daily:
            return Response([])

        submissions = DailySubmission.objects.filter(
            daily=daily, solved=True
        ).select_related('user').order_by('solve_time')[:20]

        return Response([{
            'username': s.user.username,
            'solve_time': round(s.solve_time or 0, 3),
            'attempts': s.attempts,
        } for s in submissions])


class DailyStreakView(APIView):
    """User's streak info with multiplier."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from leaderboard.models import PlayerStats
        stats, _ = PlayerStats.objects.get_or_create(user=request.user)

        return Response({
            'current': stats.daily_streak,
            'best': stats.best_daily_streak,
            'last_completed': str(stats.last_daily_completed) if stats.last_daily_completed else None,
            'multiplier': 2.0 if stats.daily_streak >= 30 else (1.5 if stats.daily_streak >= 7 else 1.0),
        })


# ============================================================
# Phase 5 — Tournaments
# ============================================================

def _serialize_match(m, username=None):
    """Helper to serialize a TournamentMatch."""
    return {
        'id': m.id,
        'round_number': m.round_number,
        'match_number': m.match_number,
        'player1': m.player1.username if m.player1 else None,
        'player2': m.player2.username if m.player2 else None,
        'winner': m.winner.username if m.winner else None,
        'status': m.status,
        'p1_passed': m.p1_passed,
        'p1_total': m.p1_total,
        'p2_passed': m.p2_passed,
        'p2_total': m.p2_total,
        'started_at': m.started_at.isoformat() if m.started_at else None,
        'time_limit': m.tournament.time_limit_minutes if m.tournament else 10,
        'is_my_match': username and (
            (m.player1 and m.player1.username == username) or
            (m.player2 and m.player2.username == username)
        ),
        'challenge_title': m.challenge.title if m.challenge else None,
    }


def _serialize_tournament(t, user=None):
    """Helper to serialize a Tournament."""
    participants = list(t.participants.select_related('user').all())
    is_joined = user and any(p.user_id == user.id for p in participants)
    return {
        'id': t.id,
        'name': t.name,
        'description': t.description,
        'created_by': t.created_by.username,
        'max_players': t.max_players,
        'player_count': len(participants),
        'difficulty': t.difficulty,
        'status': t.status,
        'join_code': t.join_code,
        'prize_points': t.prize_points,
        'runner_up_points': t.runner_up_points,
        'elo_bonus': t.elo_bonus,
        'time_limit_minutes': t.time_limit_minutes,
        'current_round': t.current_round,
        'total_rounds': t.total_rounds,
        'winner': t.winner.username if t.winner else None,
        'is_host': user and t.created_by_id == user.id,
        'is_joined': is_joined,
        'is_full': t.is_full,
        'created_at': t.created_at.isoformat(),
        'started_at': t.started_at.isoformat() if t.started_at else None,
        'participants': [{
            'username': p.user.username,
            'seed': p.seed,
            'eliminated': p.eliminated,
            'placement': p.placement,
        } for p in participants],
    }


class TournamentListCreateView(APIView):
    """GET: list tournaments. POST: create a new one."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Tournament.objects.filter(
            status__in=['open', 'in_progress']
        ).select_related('created_by', 'winner')

        # Also include completed ones the user is in
        user_tournament_ids = TournamentParticipant.objects.filter(
            user=request.user
        ).values_list('tournament_id', flat=True)

        user_completed = Tournament.objects.filter(
            id__in=user_tournament_ids, status='completed'
        ).select_related('created_by', 'winner')[:10]

        all_tournaments = list(qs) + list(user_completed)
        # Deduplicate
        seen = set()
        unique = []
        for t in all_tournaments:
            if t.id not in seen:
                seen.add(t.id)
                unique.append(t)

        return Response([_serialize_tournament(t, request.user) for t in unique])

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Name required'}, status=status.HTTP_400_BAD_REQUEST)

        max_players = int(request.data.get('max_players', 8))
        if max_players not in [4, 8, 16]:
            max_players = 8

        t = Tournament.objects.create(
            name=name,
            description=request.data.get('description', ''),
            created_by=request.user,
            max_players=max_players,
            difficulty=request.data.get('difficulty', 'medium'),
            prize_points=int(request.data.get('prize_points', 100)),
            runner_up_points=int(request.data.get('runner_up_points', 50)),
            elo_bonus=int(request.data.get('elo_bonus', 25)),
            time_limit_minutes=int(request.data.get('time_limit_minutes', 10)),
        )

        # Host auto-joins
        TournamentParticipant.objects.create(tournament=t, user=request.user)

        return Response(_serialize_tournament(t, request.user), status=status.HTTP_201_CREATED)


class TournamentDetailView(APIView):
    """GET: tournament detail with bracket."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            t = Tournament.objects.select_related('created_by', 'winner').get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        matches = list(t.matches.select_related('player1', 'player2', 'winner', 'challenge').all())

        data = _serialize_tournament(t, request.user)
        data['matches'] = [_serialize_match(m, request.user.username) for m in matches]

        # Find user's current active match (if any)
        my_match = None
        for m in matches:
            if m.status == 'pending' and (
                (m.player1 and m.player1 == request.user) or
                (m.player2 and m.player2 == request.user)
            ):
                my_match = m
                break

        if my_match and my_match.challenge:
            challenge = my_match.challenge
            sample_tests = list(challenge.test_cases.filter(is_sample=True).values(
                'id', 'input_data', 'expected_output', 'is_sample'
            ))
            data['active_match'] = {
                'match_id': my_match.id,
                'opponent': (
                    my_match.player2.username if my_match.player1 == request.user
                    else my_match.player1.username
                ),
                'player_side': 'p1' if my_match.player1 == request.user else 'p2',
                'challenge': {
                    'id': challenge.id,
                    'title': challenge.title,
                    'description': challenge.description,
                    'difficulty': challenge.difficulty,
                    'points': challenge.points,
                    'time_limit_minutes': challenge.time_limit_minutes,
                    'hint': challenge.hint,
                    'starter_python': challenge.starter_python,
                    'starter_javascript': challenge.starter_javascript,
                    'starter_cpp': challenge.starter_cpp,
                    'starter_java': challenge.starter_java,
                    'sample_tests': sample_tests,
                    'test_count': challenge.test_cases.count(),
                },
            }
        else:
            data['active_match'] = None

        return Response(data)


class TournamentJoinView(APIView):
    """POST: join a tournament by join_code."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            t = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        join_code = request.data.get('join_code', '').strip().upper()
        if join_code != t.join_code:
            return Response({'error': 'Invalid join code'}, status=status.HTTP_400_BAD_REQUEST)

        if t.status != 'open':
            return Response({'error': 'Tournament is not open'}, status=status.HTTP_400_BAD_REQUEST)

        if t.is_full:
            return Response({'error': 'Tournament is full'}, status=status.HTTP_400_BAD_REQUEST)

        if TournamentParticipant.objects.filter(tournament=t, user=request.user).exists():
            return Response({'error': 'Already joined'}, status=status.HTTP_400_BAD_REQUEST)

        TournamentParticipant.objects.create(tournament=t, user=request.user)

        return Response(_serialize_tournament(t, request.user))


class TournamentJoinByCodeView(APIView):
    """POST: join a tournament using only the join_code (no ID needed)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        join_code = request.data.get('join_code', '').strip().upper()
        if not join_code or len(join_code) != 6:
            return Response({'error': 'Enter a 6-character join code'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            t = Tournament.objects.get(join_code=join_code)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found with that code'}, status=status.HTTP_404_NOT_FOUND)

        if t.status != 'open':
            return Response({'error': 'Tournament is not open for joining'}, status=status.HTTP_400_BAD_REQUEST)

        if t.is_full:
            return Response({'error': 'Tournament is full'}, status=status.HTTP_400_BAD_REQUEST)

        if TournamentParticipant.objects.filter(tournament=t, user=request.user).exists():
            return Response({'error': 'You have already joined this tournament'}, status=status.HTTP_400_BAD_REQUEST)

        TournamentParticipant.objects.create(tournament=t, user=request.user)

        return Response(_serialize_tournament(t, request.user))


class TournamentDeleteView(APIView):
    """DELETE: host can cancel an open or in-progress tournament."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            t = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if t.created_by != request.user:
            return Response({'error': 'Only the host can cancel'}, status=status.HTTP_403_FORBIDDEN)

        if t.status not in ('open', 'in_progress'):
            return Response({'error': 'Cannot cancel a completed tournament'}, status=status.HTTP_400_BAD_REQUEST)

        t.status = 'cancelled'
        t.save()
        # Mark all pending/in_progress matches as completed
        t.matches.filter(status__in=['pending', 'in_progress']).update(status='completed')

        return Response({'status': 'cancelled'})


class TournamentLeaveView(APIView):
    """POST: user leaves a tournament. If in_progress, forfeit active match."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            t = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        participant = TournamentParticipant.objects.filter(
            tournament=t, user=request.user
        ).first()
        if not participant:
            return Response({'error': 'Not in this tournament'}, status=status.HTTP_400_BAD_REQUEST)

        if t.status == 'open':
            # Simply remove from tournament
            participant.delete()
            return Response({'status': 'left'})

        if t.status == 'in_progress':
            # Forfeit: mark as eliminated, auto-win opponent in active match
            participant.eliminated = True
            participant.save()

            active_match = t.matches.filter(
                status__in=['pending', 'in_progress']
            ).filter(
                models.Q(player1=request.user) | models.Q(player2=request.user)
            ).first()

            if active_match:
                if active_match.player1 == request.user:
                    active_match.winner = active_match.player2
                else:
                    active_match.winner = active_match.player1
                active_match.status = 'completed'
                active_match.finished_at = timezone.now()
                active_match.save()
                t.advance_winner(active_match)

            return Response({'status': 'forfeited'})

        return Response({'error': 'Tournament is not active'}, status=status.HTTP_400_BAD_REQUEST)


class TournamentCheckTimeoutView(APIView):
    """POST: check and auto-resolve timed-out matches."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            t = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if t.status != 'in_progress':
            return Response({'timed_out': False})

        now = timezone.now()
        time_limit = datetime.timedelta(minutes=t.time_limit_minutes)
        timed_out_matches = []

        active_matches = t.matches.filter(
            status__in=['pending', 'in_progress'],
            started_at__isnull=False
        )

        for match in active_matches:
            if now - match.started_at >= time_limit:
                # Time's up! Resolve based on submissions
                if match.p1_total > 0 and match.p2_total == 0:
                    match.winner = match.player1
                elif match.p2_total > 0 and match.p1_total == 0:
                    match.winner = match.player2
                elif match.p1_total > 0 and match.p2_total > 0:
                    if match.p1_passed > match.p2_passed:
                        match.winner = match.player1
                    elif match.p2_passed > match.p1_passed:
                        match.winner = match.player2
                    elif match.p1_time <= match.p2_time:
                        match.winner = match.player1
                    else:
                        match.winner = match.player2
                else:
                    # Neither submitted — player1 wins by default
                    match.winner = match.player1

                match.status = 'completed'
                match.finished_at = now
                match.save()
                t.advance_winner(match)
                timed_out_matches.append(match.id)

        return Response({
            'timed_out': len(timed_out_matches) > 0,
            'matches': timed_out_matches,
        })


class TournamentStartView(APIView):
    """POST: host starts the tournament."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            t = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if t.created_by != request.user:
            return Response({'error': 'Only the host can start'}, status=status.HTTP_403_FORBIDDEN)

        if t.status != 'open':
            return Response({'error': 'Already started'}, status=status.HTTP_400_BAD_REQUEST)

        if t.player_count < 2:
            return Response({'error': 'Need at least 2 players'}, status=status.HTTP_400_BAD_REQUEST)

        # Pad to nearest power of 2? No — require exact power of 2 or allow any ≥2
        # For simplicity allow any count ≥ 2, but round down to power of 2
        import math
        n = t.player_count
        target = 2 ** int(math.log2(n))

        # If we have more than target, trim last joiners
        if n > target:
            extras = t.participants.order_by('-joined_at')[:n - target]
            for p in extras:
                p.delete()

        t.generate_bracket()

        return Response(_serialize_tournament(t, request.user))


class TournamentSubmitView(APIView):
    """POST: submit code for a tournament match."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        match_id = request.data.get('match_id')
        source_code = request.data.get('source_code', '')
        language_id = request.data.get('language_id', 71)

        if not source_code.strip():
            return Response({'error': 'Empty code'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            match = TournamentMatch.objects.select_related(
                'tournament', 'player1', 'player2', 'challenge'
            ).get(pk=match_id, tournament_id=pk)
        except TournamentMatch.DoesNotExist:
            return Response({'error': 'Match not found'}, status=status.HTTP_404_NOT_FOUND)

        if match.status not in ('pending', 'in_progress'):
            return Response({'error': 'Match already finished'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine which player
        if match.player1 == request.user:
            side = 'p1'
        elif match.player2 == request.user:
            side = 'p2'
        else:
            return Response({'error': 'Not your match'}, status=status.HTTP_403_FORBIDDEN)

        # Mark in progress
        if match.status == 'pending':
            match.status = 'in_progress'
            match.started_at = timezone.now()

        # Run all tests
        challenge = match.challenge
        test_cases = list(challenge.test_cases.all())
        passed = 0
        total = len(test_cases)
        total_time = 0.0
        test_results = []

        for tc in test_cases:
            result = run_judge0(source_code, language_id, tc.input_data)
            actual = result.get('stdout', '').strip()
            expected = tc.expected_output.strip()
            is_pass = (actual == expected) and result.get('status_id') == 3
            if is_pass:
                passed += 1
            exec_time = float(result.get('time') or 0)
            total_time += exec_time
            tr = {
                'passed': is_pass,
                'is_sample': tc.is_sample,
                'execution_time': exec_time,
            }
            if tc.is_sample:
                tr['input'] = tc.input_data
                tr['expected'] = expected
                tr['actual'] = actual
                if result.get('stderr'):
                    tr['stderr'] = result['stderr'][:200]
            test_results.append(tr)

        # Update scores
        if side == 'p1':
            match.p1_passed = passed
            match.p1_total = total
            match.p1_time = total_time
        else:
            match.p2_passed = passed
            match.p2_total = total
            match.p2_time = total_time

        # Check if both sides have submitted
        # For async: each player submits independently, winner decided when both are in
        both_submitted = (
            (match.p1_total > 0 or side == 'p1') and
            (match.p2_total > 0 or side == 'p2')
        )

        match_over = False
        winner_name = None

        if both_submitted and match.p1_total > 0 and match.p2_total > 0:
            # Determine winner: most tests passed, then fastest time
            if match.p1_passed > match.p2_passed:
                match.winner = match.player1
            elif match.p2_passed > match.p1_passed:
                match.winner = match.player2
            elif match.p1_time <= match.p2_time:
                match.winner = match.player1
            else:
                match.winner = match.player2

            match.status = 'completed'
            match.finished_at = timezone.now()
            match_over = True
            winner_name = match.winner.username

            # Advance bracket
            match.tournament.advance_winner(match)

        match.save()

        # ── Broadcast to spectators ─────────────────────────
        try:
            from .spectator_consumer import broadcast_spectator_update
            if match_over:
                broadcast_spectator_update(pk, 'match_completed', {
                    'match_id': match.id,
                    'winner': winner_name,
                    'p1_passed': match.p1_passed,
                    'p1_total': match.p1_total,
                    'p2_passed': match.p2_passed,
                    'p2_total': match.p2_total,
                    'round_number': match.round_number,
                })
            else:
                broadcast_spectator_update(pk, 'match_update', {
                    'match_id': match.id,
                    'player1': match.player1.username if match.player1 else None,
                    'player2': match.player2.username if match.player2 else None,
                    'p1_passed': match.p1_passed,
                    'p1_total': match.p1_total,
                    'p2_passed': match.p2_passed,
                    'p2_total': match.p2_total,
                    'status': match.status,
                })
        except Exception:
            pass  # don't break submit if broadcast fails

        return Response({
            'passed': passed,
            'total': total,
            'all_passed': passed == total,
            'test_results': test_results,
            'execution_time': round(total_time, 3),
            'match_over': match_over,
            'winner': winner_name,
            'my_side': side,
            'scores': {
                'p1': {'passed': match.p1_passed, 'total': match.p1_total},
                'p2': {'passed': match.p2_passed, 'total': match.p2_total},
            },
        })


# ============================================================
# Community Challenges
# ============================================================

class CommunityChallengeCRUDView(APIView):
    """GET: list community challenges. POST: create one with test cases."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        challenges = CodeChallenge.objects.filter(is_community=True, is_active=True)
        data = []
        for c in challenges:
            data.append({
                'id': c.id,
                'title': c.title,
                'slug': c.slug,
                'description': c.description[:200],
                'difficulty': c.difficulty,
                'points': c.points,
                'created_by': c.created_by.username if c.created_by else None,
                'test_count': c.test_cases.count(),
                'created_at': c.created_at.isoformat(),
            })
        return Response(data)

    def post(self, request):
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()
        difficulty = request.data.get('difficulty', 'easy')
        hint = request.data.get('hint', '').strip()
        test_cases = request.data.get('test_cases', [])

        if not title or not description:
            return Response({'error': 'Title and description required'}, status=status.HTTP_400_BAD_REQUEST)
        if len(test_cases) < 1:
            return Response({'error': 'At least 1 test case required'}, status=status.HTTP_400_BAD_REQUEST)

        import re
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        # Ensure unique slug
        base_slug = slug
        counter = 1
        while CodeChallenge.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        challenge = CodeChallenge.objects.create(
            title=title,
            slug=slug,
            description=description,
            difficulty=difficulty,
            hint=hint,
            is_community=True,
            created_by=request.user,
        )

        for i, tc in enumerate(test_cases):
            TestCase.objects.create(
                challenge=challenge,
                input_data=tc.get('input', ''),
                expected_output=tc.get('expected_output', ''),
                is_sample=tc.get('is_sample', i == 0),
                order=i,
            )

        return Response({
            'id': challenge.id,
            'slug': challenge.slug,
            'title': challenge.title,
        }, status=status.HTTP_201_CREATED)

    def delete(self, request):
        challenge_id = request.data.get('id')
        try:
            c = CodeChallenge.objects.get(id=challenge_id, is_community=True)
        except CodeChallenge.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if c.created_by != request.user:
            return Response({'error': 'Only the creator can delete'}, status=status.HTTP_403_FORBIDDEN)
        c.is_active = False
        c.save()
        return Response({'status': 'deleted'})


# ============================================================
# PvP Replay
# ============================================================

class PvPReplayView(APIView):
    """GET: retrieve both players' code from a completed PvP battle."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, battle_id):
        try:
            battle = PvPBattle.objects.select_related(
                'player1', 'player2', 'winner', 'challenge'
            ).get(id=battle_id)
        except PvPBattle.DoesNotExist:
            return Response({'error': 'Battle not found'}, status=status.HTTP_404_NOT_FOUND)

        # Only participants can view replay
        if request.user not in (battle.player1, battle.player2):
            return Response({'error': 'Not a participant'}, status=status.HTTP_403_FORBIDDEN)

        if battle.status != 'finished':
            return Response({'error': 'Battle not finished yet'}, status=status.HTTP_400_BAD_REQUEST)

        subs = PvPSubmission.objects.filter(battle=battle)
        p1_sub = subs.filter(player=battle.player1).first()
        p2_sub = subs.filter(player=battle.player2).first()

        def serialize_sub(sub):
            if not sub:
                return None
            return {
                'source_code': sub.source_code,
                'language_name': sub.language_name,
                'passed_tests': sub.passed_tests,
                'total_tests': sub.total_tests,
            }

        return Response({
            'battle': {
                'id': battle.id,
                'challenge_title': battle.challenge.title if battle.challenge else 'Unknown',
                'player1': battle.player1.username,
                'player2': battle.player2.username if battle.player2 else None,
                'winner': battle.winner.username if battle.winner else None,
                'p1_passed': battle.p1_passed,
                'p1_total': battle.p1_total,
                'p2_passed': battle.p2_passed,
                'p2_total': battle.p2_total,
            },
            'player1_code': serialize_sub(p1_sub),
            'player2_code': serialize_sub(p2_sub),
        })


# ============================================================
# Phase 12 — Tower Defense
# ============================================================

class TowerDefenseSubmitView(APIView):
    """Submit a Tower Defense score."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        score = request.data.get('score', 0)
        waves = request.data.get('waves_survived', 0)
        killed = request.data.get('enemies_killed', 0)

        td_score = TowerDefenseScore.objects.create(
            user=request.user,
            score=score,
            waves_survived=waves,
            enemies_killed=killed,
        )

        # Award XP based on score
        xp_earned = max(10, score // 10)
        try:
            from accounts.models import PlayerStats
            stats, _ = PlayerStats.objects.get_or_create(user=request.user)
            stats.xp += xp_earned
            stats.save()
        except Exception:
            pass

        return Response({
            'message': f'Score submitted! +{xp_earned} XP',
            'score': score,
            'waves_survived': waves,
            'enemies_killed': killed,
            'xp_earned': xp_earned,
        }, status=status.HTTP_201_CREATED)


class TowerDefenseLeaderboardView(APIView):
    """Get Tower Defense leaderboard."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Best score per user
        from django.db.models import Max
        top_scores = (
            TowerDefenseScore.objects
            .values('user__id', 'user__username')
            .annotate(best_score=Max('score'), best_waves=Max('waves_survived'))
            .order_by('-best_score')[:50]
        )

        return Response({
            'leaderboard': [
                {
                    'username': s['user__username'],
                    'score': s['best_score'],
                    'waves': s['best_waves'],
                }
                for s in top_scores
            ]
        })
