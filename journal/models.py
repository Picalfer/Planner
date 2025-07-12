from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Week(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    number = models.PositiveIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()

    @property
    def total_points(self):
        return sum(day.tasks.count() for day in self.days.all())

    @classmethod
    def get_or_create_current(cls, user):
        today = timezone.now().date()
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)

        week, created = cls.objects.get_or_create(
            user=user,
            start_date=start_date,
            defaults={
                'number': start_date.isocalendar()[1],
                'end_date': end_date
            }
        )

        if created:
            Day.create_week_days(week)

        return week


class Day(models.Model):
    week = models.ForeignKey(Week, on_delete=models.CASCADE, related_name='days')
    date = models.DateField()
    day_name = models.CharField(max_length=3)

    @property
    def today(self):
        return self.date == timezone.now().date()

    @classmethod
    def create_week_days(cls, week):
        days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        for i, name in enumerate(days):
            cls.objects.create(
                week=week,
                date=week.start_date + timedelta(days=i),
                day_name=name
            )


class Task(models.Model):
    day = models.ForeignKey(Day, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def toggle_done(self):
        self.is_done = not self.is_done
        self.save()
