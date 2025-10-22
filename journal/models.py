from django.contrib.auth.models import User
from django.db import models

class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    date = models.DateField()
    is_weekly = models.BooleanField(default=False)  # Флаг для определения недельной задачи

    def toggle_done(self):
        self.is_done = not self.is_done
        self.save()

    class Meta:
        ordering = ['date', 'created_at']
