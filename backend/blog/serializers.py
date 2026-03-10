from rest_framework import serializers
from .models import BlogPost


class BlogPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)
    is_bot = serializers.BooleanField(source='author.is_bot', read_only=True)
    excerpt = serializers.ReadOnlyField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'author_name', 'author_role', 'is_bot', 'title', 'content',
            'excerpt', 'cover_image', 'is_published', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateBlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = ['title', 'content', 'cover_image', 'is_published']
