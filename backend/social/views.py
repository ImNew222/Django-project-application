from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Post, Like, Comment
from .serializers import PostSerializer, CreatePostSerializer, CommentSerializer


class FeedView(generics.ListAPIView):
    """Get main social feed — all posts, newest first."""
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.select_related('author').prefetch_related('likes', 'comments__author').all()

    def get_serializer_context(self):
        return {'request': self.request}


class CreatePostView(generics.CreateAPIView):
    """Create a new post."""
    serializer_class = CreatePostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class DeletePostView(generics.DestroyAPIView):
    """Delete your own post."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user)


class ToggleLikeView(APIView):
    """Like or unlike a post (toggle)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)

        like, created = Like.objects.get_or_create(user=request.user, post=post)

        if not created:
            # Already liked — unlike it
            like.delete()
            return Response({'liked': False, 'like_count': post.like_count})

        return Response({'liked': True, 'like_count': post.like_count})


class AddCommentView(APIView):
    """Add a comment to a post."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Comment cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(
            author=request.user,
            post=post,
            content=content,
        )

        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class MyPostsView(generics.ListAPIView):
    """Get current user's posts."""
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user)

    def get_serializer_context(self):
        return {'request': self.request}
