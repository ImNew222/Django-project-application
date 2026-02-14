from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, UserSearchSerializer

User = get_user_model()


class ConversationListView(generics.ListAPIView):
    """List current user's conversations."""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class ConversationMessagesView(generics.ListAPIView):
    """Get messages in a conversation."""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        convo_id = self.kwargs['convo_id']
        return Message.objects.filter(
            conversation_id=convo_id,
            conversation__participants=self.request.user,
        ).select_related('sender')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Mark messages as read
        convo_id = self.kwargs['convo_id']
        Message.objects.filter(
            conversation_id=convo_id,
            is_read=False,
        ).exclude(sender=request.user).update(is_read=True)
        return response


class SendMessageView(APIView):
    """Send a message in a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, convo_id):
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            convo = Conversation.objects.get(id=convo_id, participants=request.user)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        msg = Message.objects.create(
            conversation=convo,
            sender=request.user,
            content=content,
        )
        # Update conversation timestamp
        convo.save()

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class CreateConversationView(APIView):
    """Start a new DM or group conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        participant_ids = request.data.get('participant_ids', [])
        title = request.data.get('title', '')
        is_group = request.data.get('is_group', False)

        if not participant_ids:
            return Response({'error': 'At least one participant required.'}, status=status.HTTP_400_BAD_REQUEST)

        participants = User.objects.filter(id__in=participant_ids)
        if not participants.exists():
            return Response({'error': 'No valid participants found.'}, status=status.HTTP_400_BAD_REQUEST)

        # For DM, check if conversation already exists
        if not is_group and len(participant_ids) == 1:
            other_id = participant_ids[0]
            existing = Conversation.objects.filter(
                is_group=False,
                participants=request.user,
            ).filter(participants=other_id)

            if existing.exists():
                serializer = ConversationSerializer(existing.first(), context={'request': request})
                return Response(serializer.data)

        # Create new conversation
        convo = Conversation.objects.create(
            title=title if is_group else '',
            is_group=is_group,
        )
        convo.participants.add(request.user, *participants)

        serializer = ConversationSerializer(convo, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SearchUsersView(generics.ListAPIView):
    """Search users to start a conversation."""
    serializer_class = UserSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        if len(q) < 2:
            return User.objects.none()
        return User.objects.filter(
            Q(username__icontains=q) | Q(first_name__icontains=q)
        ).exclude(id=self.request.user.id)[:20]
