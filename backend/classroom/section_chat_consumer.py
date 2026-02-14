"""
Section Chat WebSocket Consumer.

Lets section members chat in their classroom group.
Users join group `section_chat_{section_id}` and can send/receive messages.
"""
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class SectionChatConsumer(AsyncJsonWebsocketConsumer):
    """WS consumer for classroom section chat."""

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.section_id = self.scope['url_route']['kwargs']['section_id']
        self.group_name = f'section_chat_{self.section_id}'

        # Verify membership
        is_member = await self.check_access()
        if not is_member:
            await self.accept()
            await self.send_json({
                'type': 'error',
                'message': 'You are not a member of this section.',
            })
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'chat.system',
            'message': f'{self.user.username} joined the chat',
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_send(self.group_name, {
                'type': 'chat.system',
                'message': f'{self.user.username} left the chat',
            })
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get('type', '')

        if msg_type == 'send_message':
            text = content.get('message', '').strip()
            if not text or len(text) > 1000:
                return

            await self.channel_layer.group_send(self.group_name, {
                'type': 'chat.message',
                'username': self.user.username,
                'message': text,
                'timestamp': timezone.now().isoformat(),
            })

    # ── Group event handlers ───────────────────────────────

    async def chat_message(self, event):
        await self.send_json({
            'type': 'chat_message',
            'username': event['username'],
            'message': event['message'],
            'timestamp': event['timestamp'],
        })

    async def chat_system(self, event):
        await self.send_json({
            'type': 'system_message',
            'message': event['message'],
            'timestamp': timezone.now().isoformat(),
        })

    # ── DB helpers ─────────────────────────────────────────

    @database_sync_to_async
    def check_access(self):
        from classroom.models import Section, SectionMembership
        try:
            section = Section.objects.get(pk=self.section_id, is_active=True)
        except Section.DoesNotExist:
            return False
        # Teacher or member
        if section.teacher == self.user:
            return True
        return SectionMembership.objects.filter(
            section=section, student=self.user
        ).exists()
