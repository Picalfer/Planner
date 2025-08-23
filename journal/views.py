from datetime import timedelta

from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView, LogoutView
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.utils import timezone
from django.views.generic import TemplateView, View

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
        today = timezone.now().date()
        start_date = today - timedelta(days=today.weekday())

        # Создаем список дней недели
        days = []
        day_names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

        for i in range(7):
            date = start_date + timedelta(days=i)
            day_tasks = Task.objects.filter(
                user=self.request.user,
                date=date
            )

            days.append({
                'date': date,
                'day_name': day_names[i],
                'today': date == today,
                'tasks': day_tasks,
                'earned_points': day_tasks.filter(is_done=True).count()
            })

        context['days'] = days
        context['week_start'] = start_date
        context['week_end'] = start_date + timedelta(days=6)
        context['week_number'] = start_date.isocalendar()[1]
        context['total_points'] = Task.objects.filter(
            user=self.request.user,
            date__range=[start_date, start_date + timedelta(days=6)],
            is_done=True
        ).count()

        return context

    def post(self, request, *args, **kwargs):
        date_str = request.POST.get('date')
        title = request.POST.get('title')

        if date_str and title:
            try:
                date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
                Task.objects.create(
                    user=request.user,
                    date=date,
                    title=title
                )

                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'status': 'success'})

            except ValueError:
                pass

        return redirect('week')


class TaskActionsView(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        action = request.POST.get('action')
        task_id = request.POST.get('task_id')

        if not task_id:
            return JsonResponse({'status': 'error', 'message': 'Task ID is required'}, status=400)

        try:
            task = Task.objects.get(id=task_id, user=request.user)

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
    task = Task.objects.get(id=task_id, user=request.user)
    form = TaskEditForm(instance=task)
    return HttpResponse(render_to_string('journal/task_edit_form.html', {
        'form': form
    }))
