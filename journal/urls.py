from django.urls import path

from .views import WeekView, TaskActionsView, get_task_form

urlpatterns = [
    path('', WeekView.as_view(), name='week'),
    path('task-action/', TaskActionsView.as_view(), name='task_action'),
    path('get-task-form/', get_task_form, name='get_task_form'),
]
