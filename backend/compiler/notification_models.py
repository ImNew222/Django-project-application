"""
Notification system models.
"""
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """A notification sent to a user."""

    TYPE_CHOICES = [
        ('follow', 'New Follower'),
        ('battle_invite', 'Battle Invite'),
        ('battle_accepted', 'Battle Accepted'),
        ('battle_declined', 'Battle Declined'),
        ('tournament_start', 'Tournament Started'),
        ('achievement', 'Achievement Unlocked'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='sent_notifications', null=True, blank=True
    )
    notif_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, default='')
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notif_type}] → {self.recipient.username}: {self.title}"
