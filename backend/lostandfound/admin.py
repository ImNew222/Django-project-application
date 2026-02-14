from django.contrib import admin
from .models import LostFoundItem


@admin.register(LostFoundItem)
class LostFoundItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'item_type', 'category', 'status', 'author', 'location', 'created_at']
    list_filter = ['item_type', 'category', 'status', 'created_at']
    search_fields = ['title', 'description', 'location']
