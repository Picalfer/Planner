from django.urls import path

from . import views

urlpatterns = [
    path('', views.week_view, name='week'),
]
