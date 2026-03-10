from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class CustomUser(AbstractUser):
    """Custom user model with role support for Nexora."""

    ROLE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    ]

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Prefer not to say'),
    ]

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, default='')
    interests = models.CharField(max_length=300, blank=True, default='', help_text='Comma-separated interests')
    is_available_for_pairing = models.BooleanField(default=False)
    is_bot = models.BooleanField(default=False, help_text='AI bot account')

    def __str__(self):
        suffix = ' 🤖' if self.is_bot else ''
        return f"{self.username} ({self.get_role_display()}){suffix}"


class AIPersonality(models.Model):
    """
    AI bot personality — defines their behavior, content style,
    skill level, and whether they're a student or teacher bot.
    """
    BOT_ROLE_CHOICES = [
        ('student', 'Student Bot'),
        ('teacher', 'Teacher Bot'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_personality'
    )
    bot_role = models.CharField(max_length=10, choices=BOT_ROLE_CHOICES, default='student')
    display_name = models.CharField(max_length=50)
    tagline = models.CharField(max_length=100, blank=True)
    specialty = models.CharField(max_length=100, blank=True, help_text='e.g. Python, Algorithms, Web Dev')

    # Personality traits (used to prompt Gemini)
    personality_prompt = models.TextField(help_text='System prompt for generating content in this bot\'s voice')
    coding_style = models.CharField(max_length=50, default='balanced', help_text='e.g. clean, clever, verbose, minimal')

    # Skill level for PvP (0.0 = beginner, 1.0 = expert)
    skill_level = models.FloatField(default=0.5)

    # Activity config
    posts_per_day = models.IntegerField(default=2)
    comments_per_day = models.IntegerField(default=5)
    blogs_per_week = models.IntegerField(default=1)

    # Teacher-specific
    teaches_subject = models.CharField(max_length=100, blank=True, help_text='Subject area for teacher bots')
    quiz_difficulty = models.CharField(max_length=10, default='medium')

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'AI Personalities'

    def __str__(self):
        return f"{'🧑‍🏫' if self.bot_role == 'teacher' else '🤖'} {self.display_name}"

