from django.db import models
from django.conf import settings

class Notification(models.Model):
    """Real-time notification for a user."""
    
    TYPE_CHOICES = [
        ('follow', 'New Follower'),
        ('battle_invite', 'Battle Invitation'),
        ('battle_accepted', 'Battle Accepted'),
        ('battle_declined', 'Battle Declined'),
        ('tournament_start', 'Tournament Starting'),
        ('achievement', 'Achievement Unlocked'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications'
    )
    notif_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=100)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Payload: { battle_id: 123, invite_id: 456 }
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notif_type} -> {self.recipient.username}"
