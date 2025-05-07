from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('organizations.urls')),
    # Serve the frontend for all routes
    path('', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))),
    path('login/', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))),
    path('dashboard/', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))),
    path('planning/', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))),
    # Catch all other routes and serve the frontend
    path('<path:path>', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))),
]