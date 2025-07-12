from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView, LogoutView
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.views.generic import TemplateView
from django.views.generic import View

from journal.models import Week, Day
from .forms import TaskEditForm
from .models import Task


class CustomLoginView(LoginView):
    template_name = 'journal/login.html'
    redirect_authenticated_user = True

    def get_success_url(self):
        return reverse_lazy('week')


class CustomLogoutView(LogoutView):
    next_page = reverse_lazy('login')


class WeekView(LoginRequiredMixin, TemplateView):
    template_name = "journal/week.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        week = Week.get_or_create_current(self.request.user)
        context['week'] = week
        context['days'] = week.days.all()
        return context

    def post(self, request, *args, **kwargs):
        day_id = request.POST.get('day_id')
        title = request.POST.get('title')

        if day_id and title:
            day = Day.objects.get(id=day_id)
            Task.objects.create(day=day, title=title)

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'status': 'success'})

        return redirect('week')


class TaskActionsView(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        action = request.POST.get('action')
        task_id = request.POST.get('task_id')

        if not task_id:
            return JsonResponse({'status': 'error', 'message': 'Task ID is required'}, status=400)

        try:
            task = Task.objects.get(id=task_id, day__week__user=request.user)

            if action == 'toggle':
                task.toggle_done()
                return JsonResponse({'status': 'success', 'is_done': task.is_done})

            elif action == 'delete':
                task.delete()
                return JsonResponse({'status': 'success'})

            elif action == 'edit':
                form = TaskEditForm(request.POST, instance=task)
                if form.is_valid():
                    form.save()
                    return JsonResponse({'status': 'success'})
                return JsonResponse({
                    'status': 'error',
                    'errors': form.errors.as_json()
                }, status=400)

            return JsonResponse({'status': 'error', 'message': 'Invalid action'}, status=400)

        except Task.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Task not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def get_task_form(request):
    task_id = request.GET.get('task_id')
    task = Task.objects.get(id=task_id)
    form = TaskEditForm(instance=task)
    return HttpResponse(render_to_string('journal/task_edit_form.html', {
        'form': form
    }))
