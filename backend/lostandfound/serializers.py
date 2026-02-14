from rest_framework import serializers
from .models import LostFoundItem


class LostFoundItemSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LostFoundItem
        fields = [
            'id', 'author_name', 'item_type', 'item_type_display',
            'category', 'category_display', 'title', 'description',
            'location', 'image', 'contact_info', 'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateLostFoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = LostFoundItem
        fields = ['item_type', 'category', 'title', 'description', 'location', 'image', 'contact_info']
