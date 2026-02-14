from django.db import models
from django.conf import settings


class PairingRequest(models.Model):
    """A study buddy pairing request."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_pairing_requests'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_pairing_requests'
    )
    message = models.CharField(max_length=300, blank=True, default='', help_text='Optional intro message')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['from_user', 'to_user']

    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username} ({self.status})"
