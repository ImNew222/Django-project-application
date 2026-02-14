"""
WebSocket consumer for real-time notifications.

Clients connect to  ws/notifications/?token=<jwt>
Each user joins a personal channel group: notifs_{user_id}
"""
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """Push notifications to authenticated users in real-time."""

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f'notifs_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected', 'message': 'Notification channel connected.'})

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Clients don't send anything meaningful; ignore
        pass

    # ── Group message handler ──────────────────────────────
    async def notification_send(self, event):
        """Called when a notification.send message is sent to the group."""
        await self.send_json({
            'type': 'new_notification',
            'notification': event['notification'],
        })


# ── Helper: create DB notification + push via channel layer ──
def send_notification(recipient_id, notif_type, title, message='', data=None, sender=None):
    """
    Create a Notification in the DB and push it to the user's WS channel.

    This is a synchronous function — safe to call from Django views.
    """
    from .notification_models import Notification
    from django.contrib.auth import get_user_model

    User = get_user_model()

    notif = Notification.objects.create(
        recipient_id=recipient_id,
        sender=sender,
        notif_type=notif_type,
        title=title,
        message=message,
        data=data or {},
    )

    # Push via channel layer
    channel_layer = get_channel_layer()
    if channel_layer:
        payload = {
            'type': 'notification.send',
            'notification': {
                'id': notif.id,
                'type': notif.notif_type,
                'title': notif.title,
                'message': notif.message,
                'data': notif.data,
                'is_read': False,
                'sender': sender.username if sender else None,
                'created_at': notif.created_at.isoformat(),
            },
        }
        async_to_sync(channel_layer.group_send)(
            f'notifs_{recipient_id}', payload
        )

    return notif
