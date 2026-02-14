from django.db import models
from django.conf import settings


class CodeSubmission(models.Model):
    """A code submission sent to Judge0 for execution."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('accepted', 'Accepted'),
        ('wrong_answer', 'Wrong Answer'),
        ('compilation_error', 'Compilation Error'),
        ('runtime_error', 'Runtime Error'),
        ('time_limit', 'Time Limit Exceeded'),
        ('memory_limit', 'Memory Limit Exceeded'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='code_submissions',
    )
    language_id = models.IntegerField(help_text="Judge0 language ID")
    language_name = models.CharField(max_length=50, default="Python")
    source_code = models.TextField()
    stdin = models.TextField(blank=True, default='')
    stdout = models.TextField(blank=True, null=True)
    stderr = models.TextField(blank=True, null=True)
    compile_output = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    status_description = models.CharField(max_length=100, blank=True, default='')
    execution_time = models.FloatField(null=True, blank=True, help_text="Seconds")
    memory_used = models.IntegerField(null=True, blank=True, help_text="Kilobytes")
    judge0_token = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.language_name} ({self.status})"


# ============================================================
# Code Battle Models
# ============================================================

class CodeChallenge(models.Model):
    """A coding challenge / problem for the Code Battle feature."""

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    POINTS_MAP = {'easy': 10, 'medium': 25, 'hard': 50}

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(help_text="Problem description in Markdown")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='easy')
    time_limit_minutes = models.IntegerField(default=30)

    # Starter code per language
    starter_python = models.TextField(blank=True, default='')
    starter_javascript = models.TextField(blank=True, default='')
    starter_cpp = models.TextField(blank=True, default='')
    starter_java = models.TextField(blank=True, default='')

    # Hints (optional)
    hint = models.TextField(blank=True, default='', help_text="Optional hint for the student")

    is_active = models.BooleanField(default=True)
    is_community = models.BooleanField(default=False, help_text="Created by a user, not admin")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_challenges'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['difficulty', 'title']

    def __str__(self):
        return f"[{self.difficulty.upper()}] {self.title}"

    @property
    def points(self):
        return self.POINTS_MAP.get(self.difficulty, 10)


class TestCase(models.Model):
    """Input/expected-output pair for a CodeChallenge."""

    challenge = models.ForeignKey(
        CodeChallenge, on_delete=models.CASCADE, related_name='test_cases'
    )
    input_data = models.TextField(help_text="stdin input for this test")
    expected_output = models.TextField(help_text="Expected stdout (whitespace-trimmed)")
    is_sample = models.BooleanField(
        default=False,
        help_text="Sample tests are visible to the student before submitting",
    )
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        label = "Sample" if self.is_sample else "Hidden"
        return f"{label} test for {self.challenge.title}"


class BattleSession(models.Model):
    """A user's attempt at solving a CodeChallenge."""

    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('timed_out', 'Timed Out'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='battle_sessions',
    )
    challenge = models.ForeignKey(
        CodeChallenge, on_delete=models.CASCADE, related_name='sessions'
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='in_progress')
    attempts_count = models.IntegerField(default=0)
    points_earned = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user.username} → {self.challenge.title} ({self.status})"


class BattleSubmission(models.Model):
    """A single code submission within a BattleSession."""

    session = models.ForeignKey(
        BattleSession, on_delete=models.CASCADE, related_name='submissions'
    )
    source_code = models.TextField()
    language_id = models.IntegerField()
    language_name = models.CharField(max_length=50, default='Python')
    passed_tests = models.IntegerField(default=0)
    total_tests = models.IntegerField(default=0)
    all_passed = models.BooleanField(default=False)
    execution_time = models.FloatField(null=True, blank=True)
    test_results = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Attempt #{self.session.attempts_count} — {self.passed_tests}/{self.total_tests}"


class PvPBattle(models.Model):
    """Real-time 1v1 code battle between two players."""

    STATUS_CHOICES = [
        ('waiting', 'Waiting for opponent'),
        ('countdown', 'Countdown'),
        ('in_progress', 'In Progress'),
        ('finished', 'Finished'),
    ]

    room_code = models.CharField(max_length=50, unique=True)
    challenge = models.ForeignKey(
        CodeChallenge, on_delete=models.CASCADE, related_name='pvp_battles', null=True
    )

    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pvp_as_p1'
    )
    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='pvp_as_p2', null=True, blank=True
    )
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        related_name='pvp_wins', null=True, blank=True
    )

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='waiting')

    # Scores
    p1_passed = models.IntegerField(default=0)
    p1_total = models.IntegerField(default=0)
    p1_time = models.FloatField(default=0.0)
    p2_passed = models.IntegerField(default=0)
    p2_total = models.IntegerField(default=0)
    p2_time = models.FloatField(default=0.0)

    difficulty = models.CharField(max_length=10, default='easy')
    points_awarded = models.IntegerField(default=0)

    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        p2 = self.player2.username if self.player2 else '???'
        return f"{self.player1.username} vs {p2} [{self.status}]"


class PvPSubmission(models.Model):
    """Stores a player's code submission in a PvP battle for replay."""
    battle = models.ForeignKey(PvPBattle, on_delete=models.CASCADE, related_name='code_submissions')
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pvp_code_submissions'
    )
    source_code = models.TextField()
    language_id = models.IntegerField(default=71)
    language_name = models.CharField(max_length=50, default='Python')
    passed_tests = models.IntegerField(default=0)
    total_tests = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.player.username} in {self.battle.room_code}"


# ============================================================
# Daily Challenges
# ============================================================

class DailyChallenge(models.Model):
    """A daily coding challenge — one per day, auto-rotated."""
    DIFFICULTY_CYCLE = ['easy', 'medium', 'hard']

    date = models.DateField(unique=True)
    challenge = models.ForeignKey(CodeChallenge, on_delete=models.CASCADE, related_name='daily_features')
    difficulty = models.CharField(max_length=10)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Daily {self.date} — {self.challenge.title} ({self.difficulty})"

    @classmethod
    def get_or_create_today(cls):
        from django.utils import timezone
        import datetime
        today = timezone.now().date()
        try:
            return cls.objects.get(date=today)
        except cls.DoesNotExist:
            # Cycle difficulty based on day of year
            diff_idx = today.timetuple().tm_yday % 3
            difficulty = cls.DIFFICULTY_CYCLE[diff_idx]
            # Pick a challenge not recently used
            recent_ids = list(
                cls.objects.order_by('-date')[:14].values_list('challenge_id', flat=True)
            )
            challenge = CodeChallenge.objects.filter(
                difficulty=difficulty, is_active=True
            ).exclude(id__in=recent_ids).order_by('?').first()
            if not challenge:
                challenge = CodeChallenge.objects.filter(
                    is_active=True
                ).order_by('?').first()
            if not challenge:
                return None
            return cls.objects.create(
                date=today, challenge=challenge, difficulty=difficulty
            )


class DailySubmission(models.Model):
    """A user's attempt at the daily challenge."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_submissions'
    )
    daily = models.ForeignKey(DailyChallenge, on_delete=models.CASCADE, related_name='submissions')
    solved = models.BooleanField(default=False)
    solve_time = models.FloatField(null=True, blank=True, help_text="Seconds to solve")
    attempts = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'daily')
        ordering = ['-submitted_at']

    def __str__(self):
        status = '✅' if self.solved else '❌'
        return f"{self.user.username} {status} {self.daily.date}"


# ============================================================
# Tournaments
# ============================================================

import uuid as _uuid
import math


def _gen_join_code():
    return _uuid.uuid4().hex[:6].upper()


class Tournament(models.Model):
    """A bracket-based elimination tournament."""

    SIZE_CHOICES = [(4, '4 Players'), (8, '8 Players'), (16, '16 Players')]
    STATUS_CHOICES = [
        ('open', 'Open for joining'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hosted_tournaments'
    )
    max_players = models.IntegerField(choices=SIZE_CHOICES, default=8)
    difficulty = models.CharField(max_length=10, default='medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    join_code = models.CharField(max_length=6, unique=True, default=_gen_join_code)

    prize_points = models.IntegerField(default=100, help_text="Rank points for the winner")
    runner_up_points = models.IntegerField(default=50, help_text="Rank points for the runner-up")
    elo_bonus = models.IntegerField(default=25, help_text="ELO bonus for the winner")
    time_limit_minutes = models.IntegerField(default=10, help_text="Minutes per match")
    current_round = models.IntegerField(default=0)
    total_rounds = models.IntegerField(default=0)

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tournaments_won'
    )

    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} [{self.status}] ({self.participants.count()}/{self.max_players})"

    @property
    def player_count(self):
        return self.participants.count()

    @property
    def is_full(self):
        return self.player_count >= self.max_players

    def generate_bracket(self):
        """Seed players by ELO and create round 1 matches."""
        from leaderboard.models import PlayerStats
        from django.utils import timezone

        participants = list(self.participants.select_related('user').all())
        n = len(participants)

        # Must be power of 2 for clean bracket
        if n < 2:
            return

        # Seed by ELO (highest ELO = seed 1)
        for p in participants:
            stats, _ = PlayerStats.objects.get_or_create(user=p.user)
            p._elo = stats.elo_rating
        participants.sort(key=lambda p: p._elo, reverse=True)

        for i, p in enumerate(participants):
            p.seed = i + 1
            p.save()

        self.total_rounds = int(math.log2(n))
        self.current_round = 1
        self.status = 'in_progress'
        self.started_at = timezone.now()
        self.save()

        # Create round 1 matches (1v8, 2v7, 3v6, 4v5 for 8 players)
        matches_count = n // 2
        for i in range(matches_count):
            p1 = participants[i]
            p2 = participants[n - 1 - i]

            # Pick a random challenge
            challenge = CodeChallenge.objects.filter(
                difficulty=self.difficulty, is_active=True
            ).order_by('?').first()
            if not challenge:
                challenge = CodeChallenge.objects.filter(is_active=True).order_by('?').first()

            TournamentMatch.objects.create(
                tournament=self,
                round_number=1,
                match_number=i + 1,
                player1=p1.user,
                player2=p2.user,
                challenge=challenge,
                status='pending',
            )

    def advance_winner(self, match):
        """Called when a match ends. Creates next round or finishes tournament."""
        from django.utils import timezone

        if not match.winner:
            return

        # Mark loser as eliminated
        loser = match.player2 if match.winner == match.player1 else match.player1
        TournamentParticipant.objects.filter(
            tournament=self, user=loser
        ).update(eliminated=True)

        # Check if all matches in current round are done
        current_matches = self.matches.filter(round_number=self.current_round)
        if current_matches.filter(status='pending').exists() or \
           current_matches.filter(status='in_progress').exists():
            return  # Still matches to play

        # All done — advance to next round
        winners = [m.winner for m in current_matches.filter(status='completed')]

        if len(winners) == 1:
            # Tournament over!
            self.winner = winners[0]
            self.status = 'completed'
            self.finished_at = timezone.now()
            self.save()

            # Award prizes
            try:
                from leaderboard.models import PlayerStats
                # Winner: rank points + ELO bonus
                stats, _ = PlayerStats.objects.get_or_create(user=self.winner)
                stats.rank_points += self.prize_points
                stats.elo_rating += self.elo_bonus
                stats.save()
            except Exception:
                pass

            # Set placements
            TournamentParticipant.objects.filter(
                tournament=self, user=self.winner
            ).update(placement=1)

            # Runner-up
            final_match = current_matches.first()
            if final_match:
                runner_up = final_match.player2 if final_match.winner == final_match.player1 else final_match.player1
                TournamentParticipant.objects.filter(
                    tournament=self, user=runner_up
                ).update(placement=2)
                # Runner-up: rank points
                try:
                    from leaderboard.models import PlayerStats
                    ru_stats, _ = PlayerStats.objects.get_or_create(user=runner_up)
                    ru_stats.rank_points += self.runner_up_points
                    ru_stats.save()
                except Exception:
                    pass
            return

        # Create next round matches
        self.current_round += 1
        self.save()

        for i in range(0, len(winners), 2):
            p1 = winners[i]
            p2 = winners[i + 1] if i + 1 < len(winners) else None

            challenge = CodeChallenge.objects.filter(
                difficulty=self.difficulty, is_active=True
            ).order_by('?').first()
            if not challenge:
                challenge = CodeChallenge.objects.filter(is_active=True).order_by('?').first()

            m = TournamentMatch.objects.create(
                tournament=self,
                round_number=self.current_round,
                match_number=(i // 2) + 1,
                player1=p1,
                player2=p2,
                challenge=challenge,
                status='pending' if p2 else 'completed',
            )

            # Bye (odd number of winners — shouldn't happen with power of 2)
            if not p2:
                m.winner = p1
                m.status = 'completed'
                m.save()


class TournamentParticipant(models.Model):
    """A player enrolled in a tournament."""
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tournament_entries')
    seed = models.IntegerField(default=0)
    eliminated = models.BooleanField(default=False)
    placement = models.IntegerField(null=True, blank=True, help_text="1=winner, 2=runner-up, etc.")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'user')
        ordering = ['seed']

    def __str__(self):
        return f"{self.user.username} (seed #{self.seed}) in {self.tournament.name}"


class TournamentMatch(models.Model):
    """A single match within a tournament bracket."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('bye', 'Bye'),
    ]

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    round_number = models.IntegerField()
    match_number = models.IntegerField()

    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='tournament_matches_as_p1', null=True, blank=True
    )
    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='tournament_matches_as_p2', null=True, blank=True
    )
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tournament_matches_won'
    )

    challenge = models.ForeignKey(
        CodeChallenge, on_delete=models.SET_NULL, null=True, blank=True
    )

    p1_passed = models.IntegerField(default=0)
    p1_total = models.IntegerField(default=0)
    p1_time = models.FloatField(default=0.0)
    p2_passed = models.IntegerField(default=0)
    p2_total = models.IntegerField(default=0)
    p2_time = models.FloatField(default=0.0)

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['round_number', 'match_number']

    def __str__(self):
        p1 = self.player1.username if self.player1 else 'TBD'
        p2 = self.player2.username if self.player2 else 'TBD'
        return f"R{self.round_number}M{self.match_number}: {p1} vs {p2}"


# ============================================================
# Tower Defense Score
# ============================================================

class TowerDefenseScore(models.Model):
    """Stores a player's score from a Code Tower Defense game."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='td_scores'
    )
    score = models.IntegerField(default=0)
    waves_survived = models.IntegerField(default=0)
    enemies_killed = models.IntegerField(default=0)
    played_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score']

    def __str__(self):
        return f"{self.user.username}: {self.score}pts (Wave {self.waves_survived})"
