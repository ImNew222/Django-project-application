from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/quiz/', include('quiz.urls')),
    path('api/leaderboard/', include('leaderboard.urls')),
    path('api/social/', include('social.urls')),
    path('api/blog/', include('blog.urls')),
    path('api/lostandfound/', include('lostandfound.urls')),
    path('api/typing/', include('typingcontest.urls')),
    path('api/messaging/', include('messaging.urls')),
    path('api/pairing/', include('pairing.urls')),
    path('api/compiler/', include('compiler.urls')),
    path('api/classroom/', include('classroom.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
