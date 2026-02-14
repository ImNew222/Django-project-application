from django.db import models
from django.conf import settings


class PlayerStats(models.Model):
    """Tracks overall quiz stats, ELO rating, and rankings for each user."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stats')
    total_quizzes = models.IntegerField(default=0)
    total_correct = models.IntegerField(default=0)
    total_questions_answered = models.IntegerField(default=0)
    total_score = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)  # Consecutive quizzes with >= 70%
    best_streak = models.IntegerField(default=0)
    rank_points = models.IntegerField(default=0)

    # ELO Rating System
    elo_rating = models.IntegerField(default=1000)
    pvp_wins = models.IntegerField(default=0)
    pvp_losses = models.IntegerField(default=0)
    pvp_draws = models.IntegerField(default=0)

    # Daily Challenge Streaks
    daily_streak = models.IntegerField(default=0)
    best_daily_streak = models.IntegerField(default=0)
    last_daily_completed = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-rank_points']
        verbose_name_plural = 'Player Stats'

    def __str__(self):
        return f"{self.user.username} — {self.rank_points} pts | ELO: {self.elo_rating} | {self.elo_tier}"

    @property
    def accuracy(self):
        if self.total_questions_answered == 0:
            return 0
        return round((self.total_correct / self.total_questions_answered) * 100, 1)

    @property
    def rank_title(self):
        """Fun rank titles based on points."""
        if self.rank_points >= 5000:
            return 'Legend'
        elif self.rank_points >= 3000:
            return 'Master'
        elif self.rank_points >= 1500:
            return 'Expert'
        elif self.rank_points >= 500:
            return 'Scholar'
        elif self.rank_points >= 100:
            return 'Learner'
        return 'Newbie'

    ELO_TIERS = [
        (2000, 'Master',  '👑'),
        (1600, 'Diamond', '💎'),
        (1200, 'Gold',    '🥇'),
        (800,  'Silver',  '🥈'),
        (0,    'Bronze',  '🥉'),
    ]

    @property
    def elo_tier(self):
        """ELO-based competitive tier."""
        for threshold, name, _ in self.ELO_TIERS:
            if self.elo_rating >= threshold:
                return name
        return 'Bronze'

    @property
    def elo_tier_icon(self):
        for threshold, _, icon in self.ELO_TIERS:
            if self.elo_rating >= threshold:
                return icon
        return '🥉'

    @property
    def pvp_total(self):
        return self.pvp_wins + self.pvp_losses + self.pvp_draws

    @property
    def pvp_winrate(self):
        if self.pvp_total == 0:
            return 0
        return round((self.pvp_wins / self.pvp_total) * 100, 1)

    def update_elo(self, opponent_elo, won, draw=False):
        """Update ELO after a PvP battle using standard ELO formula."""
        K = 32  # K-factor

        # Expected score
        expected = 1 / (1 + 10 ** ((opponent_elo - self.elo_rating) / 400))

        # Actual score
        if draw:
            actual = 0.5
            self.pvp_draws += 1
        elif won:
            actual = 1.0
            self.pvp_wins += 1
        else:
            actual = 0.0
            self.pvp_losses += 1

        # New ELO (floor at 0)
        self.elo_rating = max(0, round(self.elo_rating + K * (actual - expected)))
        self.save()

        # Return ELO change for display
        return round(K * (actual - expected))

    def update_after_quiz(self, score, total_questions):
        """Update stats after a quiz is completed."""
        self.total_quizzes += 1
        self.total_correct += score
        self.total_questions_answered += total_questions

        percentage = (score / total_questions * 100) if total_questions > 0 else 0

        # Base points from score
        points_earned = score * 10
        self.total_score += score
        self.rank_points += points_earned

        # Streak: >= 70% to keep streak going
        if percentage >= 70:
            self.current_streak += 1
            if self.current_streak > self.best_streak:
                self.best_streak = self.current_streak
        else:
            self.current_streak = 0

        self.save()
