from django.shortcuts import render
from .models import Week


def week_view(request):
    if not request.user.is_authenticated:
        from django.contrib.auth.models import User
        request.user = User.objects.first() or User.objects.create(username='temp_user')

    week = Week.get_or_create_current(request.user)
    return render(request, "journal/week.html", {
        'week': week,
        'days': week.days.all()
    })