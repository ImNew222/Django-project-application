"""WebSocket URL routing for Code Battle, Chess Battle, Notifications, Spectator & Chat."""
from django.urls import re_path
from . import consumers
from .chess_consumer import ChessBattleConsumer
from .notification_consumer import NotificationConsumer
from .spectator_consumer import SpectatorConsumer
from .tournament_chat_consumer import TournamentChatConsumer
from classroom.section_chat_consumer import SectionChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/battle/$', consumers.BattleConsumer.as_asgi()),
    re_path(r'ws/chess-battle/$', ChessBattleConsumer.as_asgi()),
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
    re_path(r'ws/spectate/(?P<tournament_id>\d+)/$', SpectatorConsumer.as_asgi()),
    re_path(r'ws/tournament-chat/(?P<tournament_id>\d+)/$', TournamentChatConsumer.as_asgi()),
    re_path(r'ws/section-chat/(?P<section_id>\d+)/$', SectionChatConsumer.as_asgi()),
]

