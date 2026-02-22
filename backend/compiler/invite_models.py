from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class BattleInvite(models.Model):
    """Direct 1v1 battle invitation between users."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invites'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_invites'
    )
    difficulty = models.CharField(max_length=10, default='easy')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=2)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender} -> {self.receiver} [{self.status}]"
