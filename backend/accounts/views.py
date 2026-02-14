from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, UserProfileUpdateSerializer
from leaderboard.models import PlayerStats

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user account."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        # Create PlayerStats for the new user
        PlayerStats.objects.create(user=user)


class MeView(APIView):
    """Get current logged-in user's profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change the current user's password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        new_password2 = request.data.get('new_password2', '')

        if not request.user.check_password(old_password):
            return Response({'old_password': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'new_password': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if new_password != new_password2:
            return Response({'new_password2': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})


class DeleteAccountView(APIView):
    """Delete the current user's account."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password', '')
        if not request.user.check_password(password):
            return Response({'password': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.delete()
        return Response({'detail': 'Account deleted.'}, status=status.HTTP_200_OK)

