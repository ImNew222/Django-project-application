from django.urls import path
from . import views

urlpatterns = [
    # Sections
    path('sections/', views.SectionListCreateView.as_view(), name='section-list-create'),
    path('sections/join/', views.SectionJoinView.as_view(), name='section-join'),
    path('sections/<int:pk>/', views.SectionDetailView.as_view(), name='section-detail'),
    path('sections/<int:pk>/leave/', views.SectionLeaveView.as_view(), name='section-leave'),
    path('sections/<int:pk>/students/', views.SectionStudentsView.as_view(), name='section-students'),

    # Assignments
    path('sections/<int:pk>/assignments/', views.SectionAssignmentListView.as_view(), name='section-assignments'),
    path('sections/<int:pk>/assign/', views.AssignmentCreateView.as_view(), name='section-assign'),
]
