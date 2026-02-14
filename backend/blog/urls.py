from django.urls import path
from . import views

urlpatterns = [
    path('', views.BlogListView.as_view(), name='blog-list'),
    path('<int:pk>/', views.BlogDetailView.as_view(), name='blog-detail'),
    path('create/', views.BlogCreateView.as_view(), name='blog-create'),
    path('<int:pk>/update/', views.BlogUpdateView.as_view(), name='blog-update'),
    path('<int:pk>/delete/', views.BlogDeleteView.as_view(), name='blog-delete'),
]
