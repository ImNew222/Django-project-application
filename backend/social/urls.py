from django.urls import path
from . import views

urlpatterns = [
    path('feed/', views.FeedView.as_view(), name='feed'),
    path('posts/', views.CreatePostView.as_view(), name='create-post'),
    path('posts/<int:pk>/delete/', views.DeletePostView.as_view(), name='delete-post'),
    path('posts/<int:post_id>/like/', views.ToggleLikeView.as_view(), name='toggle-like'),
    path('posts/<int:post_id>/comment/', views.AddCommentView.as_view(), name='add-comment'),
    path('my-posts/', views.MyPostsView.as_view(), name='my-posts'),
]
