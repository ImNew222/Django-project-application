from django.contrib import admin
from .models import Section, SectionMembership, SectionAssignment


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'teacher', 'join_code', 'member_count', 'is_active', 'created_at']
    list_filter = ['program', 'year_level', 'is_active']
    search_fields = ['teacher__username', 'join_code']
    readonly_fields = ['join_code', 'created_at']


@admin.register(SectionMembership)
class SectionMembershipAdmin(admin.ModelAdmin):
    list_display = ['student', 'section', 'joined_at']
    list_filter = ['section__program', 'section__year_level']
    search_fields = ['student__username']


@admin.register(SectionAssignment)
class SectionAssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'assignment_type', 'section', 'assigned_by', 'due_date', 'created_at']
    list_filter = ['assignment_type', 'section']
    search_fields = ['title']
