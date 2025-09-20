from django.urls import path

from . import views
from .views import WeekView

urlpatterns = [
    path('', WeekView.as_view(), name='week'),
    path('api/tasks/create/', views.create_task, name='create_task'),
]
