"""
Tournament Chat WebSocket Consumer.

Lets tournament participants chat while waiting between rounds.
Users join group `tchat_{tournament_id}` and can send/receive messages.
"""
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class TournamentChatConsumer(AsyncJsonWebsocketConsumer):
    """WS consumer for tournament lobby chat."""

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
        self.group_name = f'tchat_{self.tournament_id}'

        # Verify user is a participant
        is_participant = await self.check_participant()
        if not is_participant:
            await self.accept()
            await self.send_json({
                'type': 'error',
                'message': 'You are not a participant in this tournament.',
            })
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Announce arrival
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
            if not text or len(text) > 500:
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

    # ── Database helpers ───────────────────────────────────

    @database_sync_to_async
    def check_participant(self):
        from .models import TournamentParticipant
        return TournamentParticipant.objects.filter(
            tournament_id=self.tournament_id,
            player=self.user,
        ).exists()
