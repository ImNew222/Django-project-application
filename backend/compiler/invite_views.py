"""
Battle Invite REST API views.
"""
import uuid
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .invite_models import BattleInvite
from .models import PvPBattle
from .notification_consumer import send_notification


class SendInviteView(APIView):
    """POST: send a battle invite to another user.

    Body: { "receiver_id": <int>, "difficulty": "easy"|"medium"|"hard" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        difficulty = request.data.get('difficulty', 'easy')

        if not receiver_id:
            return Response({'error': 'receiver_id required'}, status=status.HTTP_400_BAD_REQUEST)

        if int(receiver_id) == request.user.id:
            return Response({'error': 'Cannot invite yourself'}, status=status.HTTP_400_BAD_REQUEST)

        if difficulty not in ('easy', 'medium', 'hard'):
            difficulty = 'easy'

        # Check for existing pending invite
        existing = BattleInvite.objects.filter(
            sender=request.user, receiver_id=receiver_id, status='pending',
            expires_at__gt=timezone.now()
        ).first()
        if existing:
            return Response({'error': 'You already have a pending invite to this user'},
                            status=status.HTTP_400_BAD_REQUEST)

        invite = BattleInvite.objects.create(
            sender=request.user,
            receiver_id=receiver_id,
            difficulty=difficulty,
        )

        # Send real-time notification
        send_notification(
            recipient_id=receiver_id,
            notif_type='battle_invite',
            title=f'⚔️ {request.user.username} challenged you!',
            message=f'{difficulty.capitalize()} difficulty battle',
            data={'invite_id': invite.id, 'difficulty': difficulty},
            sender=request.user,
        )

        return Response({
            'status': 'sent',
            'invite_id': invite.id,
            'expires_at': invite.expires_at.isoformat(),
        })


class RespondInviteView(APIView):
    """POST: accept or decline a battle invite.

    Body: { "action": "accept"|"decline" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invite = BattleInvite.objects.get(id=pk, receiver=request.user)
        except BattleInvite.DoesNotExist:
            return Response({'error': 'Invite not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check expiry
        if invite.is_expired:
            invite.status = 'expired'
            invite.save()
            return Response({'error': 'Invite has expired'}, status=status.HTTP_400_BAD_REQUEST)

        if invite.status != 'pending':
            return Response({'error': f'Invite already {invite.status}'},
                            status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action', '')

        if action == 'decline':
            invite.status = 'declined'
            invite.save()

            send_notification(
                recipient_id=invite.sender_id,
                notif_type='battle_declined',
                title=f'😔 {request.user.username} declined your challenge',
                message='',
                data={'invite_id': invite.id},
                sender=request.user,
            )
            return Response({'status': 'declined'})

        if action == 'accept':
            invite.status = 'accepted'
            invite.save()

            # Create a PvP battle room
            room_code = f'invite-{uuid.uuid4().hex[:8]}'
            battle = PvPBattle.objects.create(
                room_code=room_code,
                difficulty=invite.difficulty,
                player1=invite.sender,
                player2=request.user,
                status='waiting',
            )

            # Notify both players with room_code
            send_notification(
                recipient_id=invite.sender_id,
                notif_type='battle_accepted',
                title=f'🎉 {request.user.username} accepted your challenge!',
                message='Join the battle now!',
                data={
                    'invite_id': invite.id,
                    'battle_id': battle.id,
                    'room_code': room_code,
                    'difficulty': invite.difficulty,
                },
                sender=request.user,
            )

            send_notification(
                recipient_id=request.user.id,
                notif_type='battle_accepted',
                title='🎉 Battle ready!',
                message=f'Your battle with {invite.sender.username} is ready!',
                data={
                    'invite_id': invite.id,
                    'battle_id': battle.id,
                    'room_code': room_code,
                    'difficulty': invite.difficulty,
                },
                sender=invite.sender,
            )

            return Response({
                'status': 'accepted',
                'battle_id': battle.id,
                'room_code': room_code,
            })

        return Response({'error': 'action must be accept or decline'},
                        status=status.HTTP_400_BAD_REQUEST)


class PendingInvitesView(APIView):
    """GET: list pending invites for the current user (received)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Expire stale invites
        BattleInvite.objects.filter(
            status='pending', expires_at__lt=timezone.now()
        ).update(status='expired')

        invites = BattleInvite.objects.filter(
            receiver=request.user, status='pending',
            expires_at__gt=timezone.now()
        )

        data = []
        for inv in invites:
            data.append({
                'id': inv.id,
                'sender': inv.sender.username,
                'sender_id': inv.sender_id,
                'difficulty': inv.difficulty,
                'created_at': inv.created_at.isoformat(),
                'expires_at': inv.expires_at.isoformat(),
            })

        return Response(data)
