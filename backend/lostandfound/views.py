from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import LostFoundItem
from .serializers import LostFoundItemSerializer, CreateLostFoundSerializer


class LostFoundListView(generics.ListAPIView):
    """List all lost & found items. Supports filtering by type and category."""
    serializer_class = LostFoundItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = LostFoundItem.objects.select_related('author').all()

        # Filter by type (lost/found)
        item_type = self.request.query_params.get('type')
        if item_type in ['lost', 'found']:
            qs = qs.filter(item_type=item_type)

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        # Filter by status
        item_status = self.request.query_params.get('status')
        if item_status in ['open', 'claimed', 'resolved']:
            qs = qs.filter(status=item_status)

        return qs


class CreateLostFoundView(generics.CreateAPIView):
    """Post a new lost or found item."""
    serializer_class = CreateLostFoundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class UpdateStatusView(APIView):
    """Update the status of a lost/found item (owner only)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            item = LostFoundItem.objects.get(id=pk, author=request.user)
        except LostFoundItem.DoesNotExist:
            return Response({'error': 'Item not found or not yours.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in ['open', 'claimed', 'resolved']:
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        item.status = new_status
        item.save()
        return Response(LostFoundItemSerializer(item).data)


class DeleteLostFoundView(generics.DestroyAPIView):
    """Delete a lost/found item (owner only)."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LostFoundItem.objects.filter(author=self.request.user)


class MyItemsView(generics.ListAPIView):
    """Get current user's lost/found items."""
    serializer_class = LostFoundItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LostFoundItem.objects.filter(author=self.request.user)
