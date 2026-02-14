from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from . import teacher_views
from . import search_views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('delete-account/', views.DeleteAccountView.as_view(), name='delete-account'),
    path('search/', search_views.SearchView.as_view(), name='search'),
    path('students/', teacher_views.StudentListView.as_view(), name='student-list'),
    path('students/<int:student_id>/', teacher_views.StudentDetailView.as_view(), name='student-detail'),
]
