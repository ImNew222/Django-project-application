from django.contrib import admin
from .models import PairingRequest


@admin.register(PairingRequest)
class PairingRequestAdmin(admin.ModelAdmin):
    list_display = ['from_user', 'to_user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
