from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"sessions", views.SessionViewSet, basename="session")

urlpatterns = [
    path("", include(router.urls)),
    path("my/sessions/", views.MySessionsView.as_view()),
    path("bookings/", views.BookingsView.as_view()),
]
