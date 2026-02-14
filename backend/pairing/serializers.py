from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PairingRequest

User = get_user_model()


class AvailableStudentSerializer(serializers.ModelSerializer):
    """Serializer for browsing available students."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'gender', 'interests', 'bio', 'role']


class PairingRequestSerializer(serializers.ModelSerializer):
    from_username = serializers.CharField(source='from_user.username', read_only=True)
    to_username = serializers.CharField(source='to_user.username', read_only=True)
    from_gender = serializers.CharField(source='from_user.gender', read_only=True)
    to_gender = serializers.CharField(source='to_user.gender', read_only=True)

    class Meta:
        model = PairingRequest
        fields = [
            'id', 'from_user', 'from_username', 'from_gender',
            'to_user', 'to_username', 'to_gender',
            'message', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'from_user', 'status', 'created_at']
