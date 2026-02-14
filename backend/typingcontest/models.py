from django.db import models
from django.conf import settings


class TypingText(models.Model):
    """A text passage for typing contests."""

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    title = models.CharField(max_length=100)
    content = models.TextField(help_text="The text to be typed")
    difficulty = models.CharField(max_length=6, choices=DIFFICULTY_CHOICES, default='easy')
    word_count = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        self.word_count = len(self.content.split())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.difficulty}) - {self.word_count} words"


class TypingResult(models.Model):
    """Result of a typing contest attempt."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='typing_results')
    text = models.ForeignKey(TypingText, on_delete=models.CASCADE, related_name='results')
    wpm = models.FloatField(help_text="Words per minute")
    accuracy = models.FloatField(help_text="Accuracy percentage (0-100)")
    time_taken = models.FloatField(help_text="Time in seconds")
    errors = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-wpm']

    def __str__(self):
        return f"{self.user.username}: {self.wpm} WPM ({self.accuracy}%)"
