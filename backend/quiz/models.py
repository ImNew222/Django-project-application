import random
from django.db import models
from django.conf import settings


class Subject(models.Model):
    """Quiz subject/category (e.g., Programming, Networking)."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=10, default='📚')  # Emoji icon

    def __str__(self):
        return self.name


class Question(models.Model):
    """A single quiz question with 4 choices."""

    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('hard', 'Hard'),
    ]

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    difficulty = models.CharField(max_length=15, choices=DIFFICULTY_CHOICES, default='beginner')
    choice_a = models.CharField(max_length=255)
    choice_b = models.CharField(max_length=255)
    choice_c = models.CharField(max_length=255)
    choice_d = models.CharField(max_length=255)
    correct_answer = models.CharField(
        max_length=1,
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.difficulty}] {self.text[:60]}..."

    def get_shuffled_choices(self):
        """Return choices in random order, mapping new positions to original letters."""
        choices = [
            ('A', self.choice_a),
            ('B', self.choice_b),
            ('C', self.choice_c),
            ('D', self.choice_d),
        ]
        random.shuffle(choices)
        return choices


class QuizSession(models.Model):
    """A quiz session/attempt by a user."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    difficulty = models.CharField(max_length=15, choices=Question.DIFFICULTY_CHOICES)
    score = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=10)
    time_limit_per_question = models.IntegerField(default=30)  # seconds
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    tab_switches = models.IntegerField(default=0)  # Anti-cheat: track tab switches

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user.username} - {self.subject.name} ({self.difficulty}) - Score: {self.score}/{self.total_questions}"

    @property
    def percentage(self):
        if self.total_questions == 0:
            return 0
        return round((self.score / self.total_questions) * 100, 1)


class QuizAnswer(models.Model):
    """A single answer within a quiz session."""

    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_answer = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')], blank=True, default='')
    is_correct = models.BooleanField(default=False)
    time_spent = models.FloatField(default=0)  # seconds spent on this question
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['session', 'question']

    def __str__(self):
        status = '✓' if self.is_correct else '✗'
        return f"{status} Q: {self.question.text[:40]}..."
