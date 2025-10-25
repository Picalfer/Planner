from django.urls import path

from . import views
from .views import WeekView

urlpatterns = [
    path('', WeekView.as_view(), name='week'),

    path('api/tasks/create/', views.create_task, name='create_task'),
]


"""
    # Daily tasks API
    path('api/tasks/daily/create/', views.create_daily_task, name='create_daily_task'),
    path('api/tasks/daily/week/', views.get_week_daily_tasks, name='get_week_daily_tasks'),
    path('api/tasks/daily/<int:task_id>/', views.get_daily_task, name='get_daily_task'),
    path('api/tasks/daily/<int:task_id>/update/', views.update_daily_task, name='update_daily_task'),
    path('api/tasks/daily/<int:task_id>/delete/', views.delete_daily_task, name='delete_daily_task'),

    # Weekly tasks API
    path('api/tasks/weekly/create/', views.create_weekly_task, name='create_weekly_task'),
    path('api/tasks/weekly/week/', views.get_week_weekly_tasks, name='get_week_weekly_tasks'),
    path('api/tasks/weekly/<int:task_id>/', views.get_weekly_task, name='get_weekly_task'),
    path('api/tasks/weekly/<int:task_id>/update/', views.update_weekly_task, name='update_weekly_task'),
    path('api/tasks/weekly/<int:task_id>/delete/', views.delete_weekly_task, name='delete_weekly_task'),

    path('api/tasks/create/', views.create_task, name='create_task'),
    path('api/tasks/week/', views.get_week_tasks, name='get_week_tasks'),
    path('api/tasks/<int:task_id>/', views.get_task, name='get_task'),
    path('api/tasks/<int:task_id>/update/', views.update_task, name='update_task'),
    path('api/tasks/<int:task_id>/delete/', views.delete_task, name='delete_task'),
    """
