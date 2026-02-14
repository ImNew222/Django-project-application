from django.urls import path
from . import views

urlpatterns = [
    path('', views.LostFoundListView.as_view(), name='lostandfound-list'),
    path('create/', views.CreateLostFoundView.as_view(), name='lostandfound-create'),
    path('<int:pk>/status/', views.UpdateStatusView.as_view(), name='lostandfound-status'),
    path('<int:pk>/delete/', views.DeleteLostFoundView.as_view(), name='lostandfound-delete'),
    path('my-items/', views.MyItemsView.as_view(), name='lostandfound-my-items'),
]
