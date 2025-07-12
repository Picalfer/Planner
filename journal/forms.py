from django import forms

from .models import Task


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ['title', 'description']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Название задачи'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Описание задачи',
                'rows': 3
            })
        }


class TaskEditForm(TaskForm):
    class Meta(TaskForm.Meta):
        fields = ['title', 'description', 'is_done']
