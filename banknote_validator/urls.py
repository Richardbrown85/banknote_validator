"""
URL configuration for banknote_validator project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path
from validator.views import validate_note, latest_verdict, live_verdict, index

urlpatterns = [
    # Serves the main frontend page
    path('', index),

    # Receives image POSTs from the ESP32 and returns a verdict
    path('validate/', validate_note),

    # Returns the latest verdict as JSON (fallback endpoint)
    path('latest-verdict/', latest_verdict),

    # SSE endpoint — streams live verdict updates to the browser
    path('live/', live_verdict),
]