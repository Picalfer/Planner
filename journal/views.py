from datetime import timedelta

from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.utils import timezone
from django.views.generic import TemplateView

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


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import json


@csrf_exempt
@require_POST
def create_task(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Требуется авторизация'}, status=401)

    try:
        data = json.loads(request.body)

        if not data.get('title'):
            return JsonResponse({'error': 'Название задачи обязательно'}, status=400)

        if not data.get('date'):
            return JsonResponse({'error': 'Дата задачи обязательна'}, status=400)

        task = Task.objects.create(
            user=request.user,
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            is_done=data.get('is_done', False)
        )

        # Получаем все задачи на эту дату
        tasks = Task.objects.filter(date=data['date'], user=request.user)
        tasks_data = [{
            'id': t.id,
            'title': t.title,
            'description': t.description,
            'date': t.date.isoformat(),
            'is_done': t.is_done
        } for t in tasks]

        return JsonResponse({
            'tasks': tasks_data,
            'new_task_id': task.id
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Неверный JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
