import {showNotification} from "./utils.js";

export class TaskManager {
    constructor(weekManager) {
        this.weekManager = weekManager;
        this.allTasks = this.extractTasksFromDOM();
        this.setupModalListeners();
        this.setupTaskListeners();
    }

    setupTaskListeners() {
        window.addEventListener('click', (e) => {
            if (e.target.id === 'task-detail-modal') {
                document.getElementById('task-detail-modal').style.display = 'none';
            }
            if (e.target.id === 'confirm-modal') {
                document.getElementById('confirm-modal').style.display = 'none';
            }
        });

        document.getElementById('close-task-modal').addEventListener('click', () => {
            document.getElementById('task-detail-modal').style.display = 'none';
        });

        document.getElementById('task-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateTask();
        });

        document.getElementById('delete-task-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').style.display = 'flex';
        });

        document.getElementById('cancel-delete').addEventListener('click', () => {
            document.getElementById('confirm-modal').style.display = 'none';
        });

        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.deleteTask();
        });

        document.addEventListener('click', (e) => {
            const taskElement = e.target.closest('.task');
            if (taskElement && !e.target.closest('.task-toggle, .task-edit, .task-delete')) {
                this.openTaskModal(taskElement.dataset.taskId);
                return;
            }

            if (e.target.classList.contains('task-toggle')) {
                e.stopPropagation();
                const taskId = e.target.closest('.task').dataset.taskId;
                this.toggleTaskDone(taskId);
            }

            if (e.target.classList.contains('task-edit')) {
                e.stopPropagation();
                const taskId = e.target.closest('.task').dataset.taskId;
                this.openTaskModal(taskId);
            }

            if (e.target.classList.contains('task-delete')) {
                e.stopPropagation();
                const taskId = e.target.closest('.task').dataset.taskId;
                this.prepareDeleteTask(taskId);
            }
        });
    }

    async openTaskModal(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/`);
            if (response.ok) {
                const task = await response.json();

                document.getElementById('edit-task-id').value = task.id;
                document.getElementById('edit-task-date').value = task.date;
                document.getElementById('edit-task-title').value = task.title;
                document.getElementById('edit-task-description').value = task.description || '';
                document.getElementById('edit-task-done').checked = task.is_done;

                document.getElementById('task-detail-modal').style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading task:', error);
            showNotification('Ошибка загрузки задачи', 'error');
        }
    }

    async updateTask() {
        const formData = new FormData(document.getElementById('task-edit-form'));
        const taskData = {
            id: formData.get('id'),
            title: formData.get('title'),
            description: formData.get('description'),
            date: formData.get('date'),
            is_done: formData.get('is_done') === 'on'
        };

        try {
            const response = await fetch(`/api/tasks/${taskData.id}/update/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const updatedTask = await response.json();
                this.updateTaskInDOM(updatedTask);
                document.getElementById('task-detail-modal').style.display = 'none';

                this.updateDayStats(this.weekManager.getCurrentWeekDates());

                showNotification('Задача обновлена!', 'success');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            showNotification('Ошибка обновления задачи', 'error');
        }
    }

    prepareDeleteTask(taskId) {
        // Сохраняем ID задачи для удаления и открываем окно подтверждения
        this.taskToDelete = taskId;
        document.getElementById('confirm-modal').style.display = 'flex';
    }

    async deleteTask() {
        if (!this.taskToDelete) return;

        try {
            const response = await fetch(`/api/tasks/${this.taskToDelete}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                this.removeTaskFromDOM(this.taskToDelete);
                document.getElementById('task-detail-modal').style.display = 'none';
                document.getElementById('confirm-modal').style.display = 'none';

                // Обновляем статистику
                const currentWeekDates = this.weekManager.getCurrentWeekDates();
                this.updateDayStats(currentWeekDates);

                showNotification('Задача удалена!', 'success');
                this.taskToDelete = null;
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Ошибка удаления задачи', 'error');
        }
    }

    updateTaskInDOM(task) {
        const taskElement = document.querySelector(`.task[data-task-id="${task.id}"]`);
        if (taskElement) {
            taskElement.querySelector('.task-title').textContent = task.title;
            taskElement.classList.toggle('done', task.is_done);

            const descriptionEl = taskElement.querySelector('.task-description');
            if (task.description) {
                if (!descriptionEl) {
                    const descDiv = document.createElement('div');
                    descDiv.className = 'task-description';
                    taskElement.appendChild(descDiv);
                }
                descriptionEl.textContent = task.description;
            } else if (descriptionEl) {
                descriptionEl.remove();
            }
        }
    }

    removeTaskFromDOM(taskId) {
        const taskElement = document.querySelector(`.task[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.remove();
            this.allTasks = this.allTasks.filter(t => t.id !== taskId);
        }
    }

    extractTasksFromDOM() {
        const tasks = [];
        document.querySelectorAll('.task').forEach(taskElement => {
            const taskId = taskElement.dataset.taskId;
            const dayCard = taskElement.closest('.day-card');
            const dateStr = dayCard.querySelector('.add-task-btn')?.dataset.date;

            if (dateStr) {
                tasks.push({
                    id: taskId,
                    date: new Date(dateStr),
                    element: taskElement,
                    dayCard: dayCard
                });
            }
        });
        return tasks;
    }

    filterTasksForWeek(weekDates) {
        const dateStrings = weekDates.map(date => date.toISOString().split('T')[0]);

        this.allTasks.forEach(task => {
            const taskDateStr = task.date.toISOString().split('T')[0];
            const shouldShow = dateStrings.includes(taskDateStr);

            task.element.style.display = shouldShow ? 'block' : 'none';
        });

        this.updateDayStats(weekDates);
    }

    updateDayStats(weekDates) {
        const dateStrings = weekDates.map(date => date.toISOString().split('T')[0]);
        const dayCards = document.querySelectorAll('.day-card');

        dateStrings.forEach((dateStr, index) => {
            if (dayCards[index]) {
                const taskList = dayCards[index].querySelector('.task-list');
                const tasks = taskList.querySelectorAll('.task');
                const doneTasks = taskList.querySelectorAll('.task.done');

                const pointsElement = dayCards[index].querySelector('.points');
                if (pointsElement) {
                    if (tasks.length > 0)
                        pointsElement.textContent =
                            `${doneTasks.length} / ${tasks.length} задач`;
                    else {
                        pointsElement.textContent =
                            `Задач нет`;
                    }
                }
            }
        });
    }

    setupModalListeners() {
        const modal = document.getElementById('task-modal');
        const closeBtn = document.querySelector('.close');
        const form = document.getElementById('task-form');

        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.dataset.date;
                document.getElementById('task-date').value = date;
                modal.style.display = 'flex';
            });
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
        });
    }

    async createTask() {
        const formData = new FormData(document.getElementById('task-form'));
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            date: formData.get('date'),
            is_done: false
        };

        try {
            const response = await fetch('/api/tasks/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const result = await response.json();
                this.updateTasksForDate(result.tasks, taskData.date);

                // После добавления задачи обновляем фильтрацию по текущей неделе
                const currentWeekDates = this.weekManager.getCurrentWeekDates();
                this.filterTasksForWeek(currentWeekDates);

                document.getElementById('task-modal').style.display = 'none';
                document.getElementById('task-form').reset();
                showNotification('Задача успешно создана!', 'success');
            } else {
                const error = await response.json();
                showNotification(`Ошибка: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Error creating task:', error);
            showNotification('Ошибка создания задачи', 'error');
        }
    }

    updateTasksForDate(tasks, dateString) {
        const dayCard = this.findDayCardByDate(dateString);
        if (!dayCard) return;

        const taskList = dayCard.querySelector('.task-list');
        taskList.innerHTML = '';

        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });

        this.allTasks = this.extractTasksFromDOM();
    }


    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    addTaskToDOM(task) {
        const taskElement = this.createTaskElement(task);
        const dayCard = this.findDayCardByDate(task.date);

        if (dayCard) {
            const taskList = dayCard.querySelector('.task-list');
            taskList.appendChild(taskElement);
            this.allTasks.push({
                id: task.id,
                date: new Date(task.date),
                element: taskElement
            });
        }
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task ${task.is_done ? 'done' : ''}`;
        li.dataset.taskId = task.id;
        li.innerHTML = `
        <div class="task-main">
            <span class="task-title">${task.title}</span>
            <div class="task-actions">
                <button class="task-toggle">✓</button>
                <button class="task-edit">✎</button>
                <button class="task-delete">×</button>
            </div>
        </div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
    `;
        return li;
    }

    findDayCardByDate(dateString) {
        return document.querySelector(`.add-task-btn[data-date="${dateString}"]`)?.closest('.day-card');
    }

    displayTasksForWeek(tasks, weekDates) {
        // Очищаем только задачи, сохраняя структуру дней
        document.querySelectorAll('.task').forEach(task => task.remove());

        // Добавляем новые задачи
        tasks.forEach(task => {
            this.addTaskToDOM(task);
        });

        // Обновляем статистику
        this.updateDayStats(weekDates);
    }

    async toggleTaskDone(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/`);
            if (response.ok) {
                const task = await response.json();

                const updatedTask = {
                    ...task,
                    is_done: !task.is_done
                };

                const updateResponse = await fetch(`/api/tasks/${taskId}/update/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: JSON.stringify(updatedTask)
                });

                if (updateResponse.ok) {
                    const result = await updateResponse.json();
                    this.updateTaskInDOM(result);

                    const currentWeekDates = this.weekManager.getCurrentWeekDates();
                    this.updateDayStats(currentWeekDates);

                    showNotification('Задача обновлена!', 'success');
                }
            }
        } catch (error) {
            console.error('Error toggling task:', error);
            showNotification('Ошибка обновления задачи', 'error');
        }
    }
}