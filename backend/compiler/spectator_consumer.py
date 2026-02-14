"""
Spectator WebSocket Consumer.

Allows users to watch live tournament matches in real-time.
Spectators join a group `spectate_{tournament_id}` and receive
match score updates, round advances, and completion events.
"""
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class SpectatorConsumer(AsyncJsonWebsocketConsumer):
    """WS consumer for watching live tournament matches."""

    async def connect(self):
        self.user = self.scope.get('user')
        self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
        self.group_name = f'spectate_{self.tournament_id}'

        # Accept even unauthenticated — spectating is public
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send current bracket state
        state = await self.get_tournament_state()
        if state:
            await self.send_json({
                'type': 'initial_state',
                **state,
            })
        else:
            await self.send_json({
                'type': 'error',
                'message': 'Tournament not found.',
            })
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Spectators are read-only — ignore all client messages
        pass

    # ── Group event handlers (sent from views.py) ──────────

    async def match_update(self, event):
        """A player submitted — broadcast partial scores."""
        await self.send_json({
            'type': 'match_update',
            'match_id': event['match_id'],
            'player1': event.get('player1'),
            'player2': event.get('player2'),
            'p1_passed': event.get('p1_passed', 0),
            'p1_total': event.get('p1_total', 0),
            'p2_passed': event.get('p2_passed', 0),
            'p2_total': event.get('p2_total', 0),
            'status': event.get('status', 'in_progress'),
        })

    async def match_completed(self, event):
        """A match finished — broadcast winner."""
        await self.send_json({
            'type': 'match_completed',
            'match_id': event['match_id'],
            'winner': event.get('winner'),
            'p1_passed': event.get('p1_passed', 0),
            'p1_total': event.get('p1_total', 0),
            'p2_passed': event.get('p2_passed', 0),
            'p2_total': event.get('p2_total', 0),
            'round_number': event.get('round_number'),
        })

    async def round_advanced(self, event):
        """A new round has started."""
        await self.send_json({
            'type': 'round_advanced',
            'round_number': event.get('round_number'),
            'message': event.get('message', 'Next round has started!'),
        })

    async def tournament_completed(self, event):
        """Tournament is finished."""
        await self.send_json({
            'type': 'tournament_completed',
            'winner': event.get('winner'),
            'message': event.get('message', 'Tournament complete!'),
        })

    # ── Database helpers ───────────────────────────────────

    @database_sync_to_async
    def get_tournament_state(self):
        from .models import Tournament
        try:
            t = Tournament.objects.get(pk=self.tournament_id)
        except Tournament.DoesNotExist:
            return None

        matches = t.matches.select_related('player1', 'player2', 'winner').all()
        match_list = []
        for m in matches:
            match_list.append({
                'id': m.id,
                'round_number': m.round_number,
                'match_number': m.match_number,
                'player1': m.player1.username if m.player1 else None,
                'player2': m.player2.username if m.player2 else None,
                'winner': m.winner.username if m.winner else None,
                'p1_passed': m.p1_passed,
                'p1_total': m.p1_total,
                'p2_passed': m.p2_passed,
                'p2_total': m.p2_total,
                'status': m.status,
            })

        return {
            'tournament_id': t.id,
            'name': t.name,
            'status': t.status,
            'difficulty': t.difficulty,
            'current_round': t.current_round,
            'total_rounds': t.total_rounds,
            'winner': t.winner.username if t.winner else None,
            'player_count': t.participants.count(),
            'max_players': t.max_players,
            'matches': match_list,
        }


# ── Helper: broadcast to spectators from synchronous code ──

def broadcast_spectator_update(tournament_id, event_type, data):
    """
    Call from views.py (sync context) to push live updates
    to all spectators watching a tournament.
    """
    channel_layer = get_channel_layer()
    group = f'spectate_{tournament_id}'
    async_to_sync(channel_layer.group_send)(group, {
        'type': event_type,
        **data,
    })
