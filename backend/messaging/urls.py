from django.urls import path
from . import views

urlpatterns = [
    path('', views.ConversationListView.as_view(), name='conversation-list'),
    path('create/', views.CreateConversationView.as_view(), name='create-conversation'),
    path('<int:convo_id>/messages/', views.ConversationMessagesView.as_view(), name='conversation-messages'),
    path('<int:convo_id>/send/', views.SendMessageView.as_view(), name='send-message'),
    path('search-users/', views.SearchUsersView.as_view(), name='search-users'),
]
