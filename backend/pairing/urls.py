from django.urls import path
from . import views

urlpatterns = [
    path('available/', views.AvailableStudentsView.as_view(), name='available-students'),
    path('request/', views.SendPairingRequestView.as_view(), name='send-pairing-request'),
    path('my-requests/', views.MyPairingRequestsView.as_view(), name='my-pairing-requests'),
    path('<int:request_id>/respond/', views.RespondToRequestView.as_view(), name='respond-to-request'),
]
