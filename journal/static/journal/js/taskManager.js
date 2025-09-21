import {showNotification} from "./utils.js";

export class TaskManager {
    constructor(weekManager) {
        this.weekManager = weekManager;
        this.allTasks = this.extractTasksFromDOM();
        this.setupModalListeners();
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
                const tasksInDay = this.allTasks.filter(task =>
                    task.date.toISOString().split('T')[0] === dateStr
                );

                const pointsElement = dayCards[index].querySelector('.points');
                if (pointsElement) {
                    const doneTasks = tasksInDay.filter(task =>
                        task.element.classList.contains('done')
                    );
                    pointsElement.textContent =
                        `${tasksInDay.length} задач / ${doneTasks.length} баллов`;
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
        li.className = 'task';
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
}