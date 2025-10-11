from django.contrib.auth.models import User
from django.db import models


class BaseTask(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='%(class)s')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def toggle_done(self):
        self.is_done = not self.is_done
        self.save()

    class Meta:
        abstract = True
        ordering = ['created_at']


class DailyTask(BaseTask):
    date = models.DateField()

    class Meta(BaseTask.Meta):
        ordering = ['date', 'created_at']


class WeeklyTask(BaseTask):
    week_start = models.DateField()

    class Meta(BaseTask.Meta):
        ordering = ['week_start', 'created_at']
