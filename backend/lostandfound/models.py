from django.db import models
from django.conf import settings


class LostFoundItem(models.Model):
    """A lost or found item posted by a user."""

    TYPE_CHOICES = [
        ('lost', 'Lost'),
        ('found', 'Found'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('claimed', 'Claimed'),
        ('resolved', 'Resolved'),
    ]

    CATEGORY_CHOICES = [
        ('electronics', 'Electronics'),
        ('clothing', 'Clothing'),
        ('accessories', 'Accessories'),
        ('books', 'Books & Supplies'),
        ('id_card', 'ID Card / Documents'),
        ('wallet', 'Wallet / Money'),
        ('keys', 'Keys'),
        ('other', 'Other'),
    ]

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lost_found_items')
    item_type = models.CharField(max_length=5, choices=TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    title = models.CharField(max_length=150)
    description = models.TextField(max_length=1000)
    location = models.CharField(max_length=200, help_text="Where it was lost/found")
    image = models.ImageField(upload_to='lostandfound/', blank=True, null=True)
    contact_info = models.CharField(max_length=200, help_text="How to contact you", blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.item_type.upper()}] {self.title}"
