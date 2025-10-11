import {showNotification} from "./utils.js";

export class WeeklyTaskManager {
    constructor(weekManager) {
        this.weekManager = weekManager;
        this.allTasks = this.extractTasksFromDOM();
        this.setupModalListeners();
        this.setupTaskListeners();
        this.taskToDelete = null;
    }

    setupTaskListeners() {
        this.setupModalEventListeners();
        this.setupTaskClickHandlers();
    }

    setupModalEventListeners() {
        const closeModal = (modalId) => {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        };

        const openModal = (modalId) => {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'flex';
        };

        window.addEventListener('click', (e) => {
            if (e.target.id === 'weekly-task-detail-modal') closeModal('weekly-task-detail-modal');
            if (e.target.id === 'weekly-confirm-modal') closeModal('weekly-confirm-modal');
        });

        const closeTaskModal = document.getElementById('close-weekly-task-modal');
        const taskEditForm = document.getElementById('weekly-task-edit-form');
        const deleteBtn = document.getElementById('delete-weekly-task-btn');
        const cancelDelete = document.getElementById('cancel-weekly-delete');
        const confirmDelete = document.getElementById('confirm-weekly-delete');

        if (closeTaskModal) {
            closeTaskModal.addEventListener('click', () => closeModal('weekly-task-detail-modal'));
        }

        if (taskEditForm) {
            taskEditForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => openModal('weekly-confirm-modal'));
        }

        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => closeModal('weekly-confirm-modal'));
        }

        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.deleteTask());
        }
    }

    setupTaskClickHandlers() {
        document.addEventListener('click', (e) => {
            const taskElement = e.target.closest('.weekly-task');
            if (!taskElement) return;

            const taskId = taskElement.dataset.taskId;
            const targetClass = e.target.classList;

            if (targetClass.contains('weekly-task-toggle')) {
                e.stopPropagation();
                this.toggleTaskDone(taskId);
            } else if (targetClass.contains('weekly-task-edit')) {
                e.stopPropagation();
                this.openTaskModal(taskId);
            } else if (targetClass.contains('weekly-task-delete')) {
                e.stopPropagation();
                this.prepareDeleteTask(taskId);
            } else {
                this.openTaskModal(taskId);
            }
        });
    }

    async openTaskModal(taskId) {
        try {
            const task = await this.fetchTask(taskId);
            this.populateTaskForm(task);
            document.getElementById('weekly-task-detail-modal').style.display = 'flex';
        } catch (error) {
            this.handleError('Error loading task:', error, 'Ошибка загрузки задачи');
        }
    }

    async fetchTask(taskId) {
        const response = await fetch(`/api/tasks/weekly/${taskId}/`);
        if (!response.ok) throw new Error('Weekly task not found');
        return await response.json();
    }

    populateTaskForm(task) {
        document.getElementById('edit-weekly-task-id').value = task.id;
        document.getElementById('edit-weekly-task-week-start').value = task.week_start;
        document.getElementById('edit-weekly-task-title').value = task.title;
        document.getElementById('edit-weekly-task-description').value = task.description || '';
        document.getElementById('edit-weekly-task-done').checked = task.is_done;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        this.updateTask();
    }

    async updateTask() {
        const taskData = this.getFormData();

        try {
            const updatedTask = await this.sendTaskUpdate(taskData);
            this.updateTaskInDOM(updatedTask);
            this.closeModalAndUpdateStats('weekly-task-detail-modal');
            showNotification('Задача обновлена!', 'success');
        } catch (error) {
            this.handleError('Error updating task:', error, 'Ошибка обновления задачи');
        }
    }

    getFormData() {
        const formData = new FormData(document.getElementById('weekly-task-edit-form'));
        return {
            id: formData.get('id'),
            title: formData.get('title'),
            description: formData.get('description'),
            week_start: formData.get('week_start'),
            is_done: formData.get('is_done') === 'on'
        };
    }

    async sendTaskUpdate(taskData) {
        const response = await fetch(`/api/tasks/weekly/${taskData.id}/update/`, {
            method: 'POST',
            headers: this.getRequestHeaders(),
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Weekly task update failed');
        return await response.json();
    }

    prepareDeleteTask(taskId) {
        this.taskToDelete = taskId;
        document.getElementById('weekly-confirm-modal').style.display = 'flex';
    }

    async deleteTask() {
        if (!this.taskToDelete) return;

        try {
            await this.sendDeleteRequest(this.taskToDelete);
            this.removeTaskFromDOM(this.taskToDelete);
            this.closeModalAndUpdateStats('weekly-confirm-modal');
            showNotification('Задача удалена!', 'success');
            this.taskToDelete = null;
        } catch (error) {
            this.handleError('Error deleting task:', error, 'Ошибка удаления задачи');
        }
    }

    async sendDeleteRequest(taskId) {
        const response = await fetch(`/api/tasks/weekly/${taskId}/delete/`, {
            method: 'POST',
            headers: {'X-CSRFToken': this.getCSRFToken()}
        });
        if (!response.ok) throw new Error('Weekly task delete failed');
    }

    closeModalAndUpdateStats(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';

        const taskDetailModal = document.getElementById('weekly-task-detail-modal');
        if (taskDetailModal) taskDetailModal.style.display = 'none';

        this.updateStatistics();
    }

    updateStatistics() {
        const currentWeekDates = this.weekManager.getCurrentWeekDates();
        this.updateDayStats(currentWeekDates);
        this.updateWeekStats();
    }

    async toggleTaskDone(taskId) {
        try {
            const task = await this.fetchTask(taskId);
            const updatedTask = await this.sendTaskUpdate({...task, is_done: !task.is_done});
            this.updateTaskInDOM(updatedTask);
            this.updateStatistics();
            showNotification('Задача обновлена!', 'success');
        } catch (error) {
            this.handleError('Error toggling task:', error, 'Ошибка обновления задачи');
        }
    }

    updateTaskInDOM(task) {
        const taskElement = document.querySelector(`.weekly-task[data-task-id="${task.id}"]`);
        if (!taskElement) return;

        taskElement.querySelector('.weekly-task-title').textContent = task.title;
        taskElement.classList.toggle('done', task.is_done);
        this.updateTaskDescription(taskElement, task.description);
    }

    updateTaskDescription(taskElement, description) {
        // Удаляем ВСЕ существующие элементы описания
        const existingDescriptions = taskElement.querySelectorAll('.task-description, .weekly-task-description');
        existingDescriptions.forEach(desc => desc.remove());

        // Создаем новое описание если нужно
        if (description && description.trim() !== '') {
            const descriptionEl = document.createElement('div');
            descriptionEl.className = 'task-description general-task-description';
            descriptionEl.textContent = description;
            taskElement.appendChild(descriptionEl);
        }
    }

    removeTaskFromDOM(taskId) {
        const taskElement = document.querySelector(`.weekly-task[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.remove();
            this.allTasks = this.allTasks.filter(t => t.id !== taskId);
        }
    }

    getRequestHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken()
        };
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    handleError(consoleMsg, error, userMsg) {
        console.error('WeeklyTaskManager:', consoleMsg, error);
        showNotification(userMsg, 'error');
    }

    extractTasksFromDOM() {
        return Array.from(document.querySelectorAll('.weekly-task')).map(taskElement => {
            return {
                id: taskElement.dataset.taskId,
                date: new Date(),
                element: taskElement
            };
        });
    }

    displayTasksForWeek(tasks, weekDates) {
        this.allTasks = [];
        document.querySelectorAll('.weekly-task').forEach(task => task.remove());

        tasks.forEach(task => this.addTaskToDOM(task));
        this.updateStatistics();
    }

    addTaskToDOM(task) {
        const taskElement = this.createTaskElement(task);
        const weeklyTasksSection = document.querySelector('.weekly-tasks-section');
        const weeklyTaskList = weeklyTasksSection?.querySelector('.weekly-task-list');

        if (weeklyTaskList) {
            weeklyTaskList.appendChild(taskElement);
            this.allTasks.push({
                id: task.id,
                date: new Date(task.week_start),
                element: taskElement
            });
        }
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `weekly-task general-task ${task.is_done ? 'done' : ''}`;
        li.dataset.taskId = task.id;
        li.innerHTML = `
            <div class="weekly-task-main general-task-main">
                <span class="weekly-task-title general-task-title">${task.title}</span>
                <div class="weekly-task-actions general-task-actions">
                    <button class="weekly-task-toggle task-toggle-btn">✓</button>
                    <button class="weekly-task-edit task-edit-btn">✎</button>
                    <button class="weekly-task-delete task-delete-btn">×</button>
                </div>
            </div>
            ${task.description ? `<div class="task-description general-task-description">${task.description}</div>` : ''}
        `;
        return li;
    }

    updateDayStats(weekDates) {
        // Недельные задачи не влияют на статистику дней
        return;
    }

    updateWeekStats() {
        const weekStatsElement = document.querySelector('.week-stats .points');
        if (weekStatsElement) {
            const doneTasksCount = document.querySelectorAll('.weekly-task.done').length;
            weekStatsElement.textContent = `${doneTasksCount} баллов`;
        }
    }

    setupModalListeners() {
        const modal = document.getElementById('weekly-task-modal');
        const closeBtn = modal?.querySelector('.close');
        const form = document.getElementById('weekly-task-form');

        if (!modal || !closeBtn || !form) {
            console.warn('Weekly task modal elements not found');
            return;
        }

        document.querySelectorAll('.add-weekly-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const currentWeekDates = this.weekManager.getCurrentWeekDates();
                const weekStartDate = currentWeekDates[0].toISOString().split('T')[0];
                document.getElementById('weekly-task-week-start').value = weekStartDate;
                modal.style.display = 'flex';
            });
        });

        closeBtn.addEventListener('click', () => modal.style.display = 'none');

        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
        });
    }

    async createTask() {
        const formData = new FormData(document.getElementById('weekly-task-form'));
        const weekStartValue = formData.get('week_start');

        if (!weekStartValue) {
            showNotification('Ошибка: дата не установлена', 'error');
            return;
        }

        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            date: weekStartValue,
            is_done: false
        };

        if (!taskData.title) {
            showNotification('Пожалуйста, введите название задачи', 'error');
            return;
        }

        try {
            const result = await this.sendCreateTask(taskData);
            this.updateTasksForDate(result.tasks, taskData.date);
            document.getElementById('weekly-task-modal').style.display = 'none';
            document.getElementById('weekly-task-form').reset();
            showNotification('Задача успешно создана!', 'success');
        } catch (error) {
            this.handleError('Error creating task:', error, 'Ошибка создания задачи');
        }
    }

    async sendCreateTask(taskData) {
        const response = await fetch('/api/tasks/weekly/create/', {
            method: 'POST',
            headers: this.getRequestHeaders(),
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Weekly task create failed: ${response.status} - ${errorText}`);
        }

        return await response.json();
    }

    updateTasksForDate(tasks, weekStartString) {
        const weeklyTasksSection = document.querySelector('.weekly-tasks-section');
        const weeklyTaskList = weeklyTasksSection?.querySelector('.weekly-task-list');

        if (weeklyTaskList) {
            weeklyTaskList.innerHTML = '';
            tasks.forEach(task => weeklyTaskList.appendChild(this.createTaskElement(task)));
            this.allTasks = this.extractTasksFromDOM();
        }
    }
}