"""
Battle Invite models.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


def _default_expiry():
    return timezone.now() + timedelta(minutes=2)


class BattleInvite(models.Model):
    """A 1v1 battle challenge sent from one user to another."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='sent_invites'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='received_invites'
    )
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='easy')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_expiry)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender.username} → {self.receiver.username} [{self.status}]"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at and self.status == 'pending'
