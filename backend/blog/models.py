from django.db import models
from django.conf import settings


class BlogPost(models.Model):
    """A blog/news post — only teachers and admins can create."""

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blog_posts')
    title = models.CharField(max_length=200)
    content = models.TextField()
    cover_image = models.ImageField(upload_to='blog/', blank=True, null=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def excerpt(self):
        """Return first 200 characters as excerpt."""
        return self.content[:200] + '...' if len(self.content) > 200 else self.content
