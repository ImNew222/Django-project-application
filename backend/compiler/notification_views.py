"""
Notification REST API views.
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .notification_models import Notification


class NotificationListView(APIView):
    """GET: list user's notifications (newest first, max 50)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)[:50]
        data = []
        for n in qs:
            data.append({
                'id': n.id,
                'type': n.notif_type,
                'title': n.title,
                'message': n.message,
                'data': n.data,
                'is_read': n.is_read,
                'sender': n.sender.username if n.sender else None,
                'created_at': n.created_at.isoformat(),
            })
        return Response(data)


class NotificationMarkReadView(APIView):
    """POST: mark one notification or all as read.

    Body: { "id": <int> }  → mark one
    Body: { "all": true }  → mark all
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        notif_id = request.data.get('id')
        mark_all = request.data.get('all', False)

        if mark_all:
            Notification.objects.filter(
                recipient=request.user, is_read=False
            ).update(is_read=True)
            return Response({'status': 'all_read'})

        if notif_id:
            try:
                notif = Notification.objects.get(id=notif_id, recipient=request.user)
                notif.is_read = True
                notif.save()
                return Response({'status': 'read'})
            except Notification.DoesNotExist:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'error': 'Provide id or all=true'}, status=status.HTTP_400_BAD_REQUEST)


class NotificationUnreadCountView(APIView):
    """GET: return unread notification count."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({'unread_count': count})
