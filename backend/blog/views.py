from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import BlogPost
from .serializers import BlogPostSerializer, CreateBlogPostSerializer


class IsTeacherOrAdmin(permissions.BasePermission):
    """Only teachers and admins can create/edit blog posts."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['teacher', 'admin']


class BlogListView(generics.ListAPIView):
    """List all published blog posts."""
    serializer_class = BlogPostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True).select_related('author')


class BlogDetailView(generics.RetrieveAPIView):
    """Get a single blog post."""
    serializer_class = BlogPostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True)


class BlogCreateView(generics.CreateAPIView):
    """Create a new blog post (teachers/admins only)."""
    serializer_class = CreateBlogPostSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class BlogUpdateView(generics.UpdateAPIView):
    """Update a blog post (own posts only)."""
    serializer_class = CreateBlogPostSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def get_queryset(self):
        return BlogPost.objects.filter(author=self.request.user)


class BlogDeleteView(generics.DestroyAPIView):
    """Delete a blog post (own posts only)."""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def get_queryset(self):
        return BlogPost.objects.filter(author=self.request.user)
