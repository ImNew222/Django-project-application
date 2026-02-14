from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import PairingRequest
from .serializers import AvailableStudentSerializer, PairingRequestSerializer
from messaging.models import Conversation

User = get_user_model()


class AvailableStudentsView(generics.ListAPIView):
    """List students available for study buddy pairing."""
    serializer_class = AvailableStudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.filter(
            is_available_for_pairing=True,
            role='student',
        ).exclude(id=self.request.user.id)

        gender = self.request.query_params.get('gender')
        if gender in ['male', 'female', 'other']:
            qs = qs.filter(gender=gender)

        interests = self.request.query_params.get('interests')
        if interests:
            qs = qs.filter(interests__icontains=interests)

        return qs


class SendPairingRequestView(APIView):
    """Send a study buddy request to another student."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        to_user_id = request.data.get('to_user_id')
        message = request.data.get('message', '')

        if not to_user_id:
            return Response({'error': 'to_user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            to_user = User.objects.get(id=to_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if to_user == request.user:
            return Response({'error': 'Cannot pair with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if request already exists
        if PairingRequest.objects.filter(from_user=request.user, to_user=to_user).exists():
            return Response({'error': 'Request already sent.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check reverse request
        reverse = PairingRequest.objects.filter(from_user=to_user, to_user=request.user, status='pending').first()
        if reverse:
            # Auto-accept mutual interest
            reverse.status = 'accepted'
            reverse.save()
            _create_buddy_conversation(request.user, to_user)
            return Response({
                'message': f'Mutual match! You and {to_user.username} are now study buddies! 🎉',
                'status': 'accepted',
            }, status=status.HTTP_201_CREATED)

        pairing = PairingRequest.objects.create(
            from_user=request.user,
            to_user=to_user,
            message=message,
        )

        return Response({
            'message': f'Request sent to {to_user.username}!',
            'request': PairingRequestSerializer(pairing).data,
        }, status=status.HTTP_201_CREATED)


class MyPairingRequestsView(APIView):
    """View incoming and outgoing pairing requests."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        incoming = PairingRequest.objects.filter(
            to_user=request.user, status='pending'
        ).select_related('from_user')

        outgoing = PairingRequest.objects.filter(
            from_user=request.user
        ).select_related('to_user')

        return Response({
            'incoming': PairingRequestSerializer(incoming, many=True).data,
            'outgoing': PairingRequestSerializer(outgoing, many=True).data,
        })


class RespondToRequestView(APIView):
    """Accept or decline a pairing request."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, request_id):
        action = request.data.get('action')  # 'accept' or 'decline'

        if action not in ['accept', 'decline']:
            return Response({'error': 'Action must be accept or decline.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pairing = PairingRequest.objects.get(id=request_id, to_user=request.user, status='pending')
        except PairingRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'accept':
            pairing.status = 'accepted'
            pairing.save()
            _create_buddy_conversation(pairing.from_user, pairing.to_user)
            return Response({
                'message': f'You and {pairing.from_user.username} are now study buddies! 🎉',
                'status': 'accepted',
            })
        else:
            pairing.status = 'declined'
            pairing.save()
            return Response({
                'message': 'Request declined.',
                'status': 'declined',
            })


def _create_buddy_conversation(user1, user2):
    """Create a DM conversation when buddies are matched."""
    # Check if DM already exists
    existing = Conversation.objects.filter(
        is_group=False,
        participants=user1,
    ).filter(participants=user2)

    if not existing.exists():
        convo = Conversation.objects.create(
            title=f'🤝 Study Buddies',
            is_group=False,
        )
        convo.participants.add(user1, user2)
