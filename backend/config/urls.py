from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from boards.views import BoardStatusViewSet, BoardViewSet
from tasks.views import TaskViewSet
from users.views import me

router = DefaultRouter()
router.register(r"boards", BoardViewSet, basename="board")
router.register(r"statuses", BoardStatusViewSet, basename="status")
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", me, name="me"),
    path("api/", include(router.urls)),
]
