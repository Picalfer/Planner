import {showNotification} from "./utils.js";

export class BaseTaskManager {
    constructor(weekManager, config) {
        this.weekManager = weekManager;
        this.config = config;
        this.allTasks = [];
        this.taskToDelete = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupModalEventListeners();
        this.setupTaskClickHandlers();
        this.setupAddButtonListeners();
    }

    setupAddButtonListeners() {
        document.querySelectorAll(this.config.addButtonSelector).forEach(btn => {
            btn.addEventListener('click', (e) => this.openCreateModal(e));
        });
    }

    setupModalEventListeners() {
        // Закрытие модальных окон
        window.addEventListener('click', (e) => {
            if (e.target.id === 'task-detail-modal') this.closeModal('task-detail-modal');
            if (e.target.id === 'confirm-modal') this.closeModal('confirm-modal');
            if (e.target.id === this.config.createModalId) this.closeModal(this.config.createModalId);
        });

        // Кнопки закрытия
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Формы
        document.getElementById(this.config.createFormId).addEventListener('submit', (e) => this.handleCreateFormSubmit(e));
        document.getElementById('task-edit-form').addEventListener('submit', (e) => this.handleEditFormSubmit(e));

        // Удаление
        document.getElementById('delete-task-btn').addEventListener('click', () => this.openModal('confirm-modal'));
        document.getElementById('cancel-delete').addEventListener('click', () => this.closeModal('confirm-modal'));
        document.getElementById('confirm-delete').addEventListener('click', () => this.deleteTask());
    }

    setupTaskClickHandlers() {
        document.addEventListener('click', (e) => {
            const taskElement = e.target.closest(this.config.taskSelector);
            if (!taskElement) return;

            const taskId = taskElement.dataset.taskId;
            const targetClass = e.target.classList;

            if (targetClass.contains('task-toggle')) {
                e.stopPropagation();
                this.toggleTaskDone(taskId);
            } else if (targetClass.contains('task-edit')) {
                e.stopPropagation();
                this.openEditModal(taskId);
            } else if (targetClass.contains('task-delete')) {
                e.stopPropagation();
                this.prepareDeleteTask(taskId);
            } else {
                this.openEditModal(taskId);
            }
        });
    }

    // Абстрактные методы для реализации в дочерних классах
    getTaskContainer(date) {
        throw new Error('Method getTaskContainer must be implemented in child class');
    }

    formatTaskDataForAPI(formData) {
        throw new Error('Method formatTaskDataForAPI must be implemented in child class');
    }

    // Методы модальных окон
    openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    openCreateModal(e) {
        throw new Error('Method openCreateModal must be implemented in child class');
    }

    // Работа с задачами
    async openEditModal(taskId) {
        try {
            const task = await this.fetchTask(taskId);
            this.populateEditForm(task);
            this.openModal('task-detail-modal');
        } catch (error) {
            this.handleError('Error loading task:', error, 'Ошибка загрузки задачи');
        }
    }

    populateEditForm(task) {
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-type').value = this.config.type;
        document.getElementById('edit-task-date').value = task.date || task.week_start;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-description').value = task.description || '';
        document.getElementById('edit-task-done').checked = task.is_done;
    }

    async fetchTask(taskId) {
        const response = await fetch(`${this.config.endpoints.getTask}/${taskId}/`);
        if (!response.ok) throw new Error('Task not found');
        return await response.json();
    }

    // Обработка форм
    handleCreateFormSubmit(e) {
        e.preventDefault();
        this.createTask();
    }

    handleEditFormSubmit(e) {
        e.preventDefault();
        this.updateTask();
    }

    async createTask() {
        const formData = new FormData(document.getElementById(this.config.createFormId));
        const taskData = this.formatTaskDataForAPI(formData);

        try {
            const result = await this.sendCreateTask(taskData);
            this.updateTasksDisplay(result.tasks, taskData);
            this.closeModal(this.config.createModalId);
            document.getElementById(this.config.createFormId).reset();
            showNotification('Задача успешно создана!', 'success');
        } catch (error) {
            this.handleError('Error creating task:', error, 'Ошибка создания задачи');
        }
    }

    async updateTask() {
        const formData = new FormData(document.getElementById('task-edit-form'));
        const taskData = {
            id: formData.get('id'),
            title: formData.get('title'),
            description: formData.get('description'),
            is_done: formData.get('is_done') === 'on'
        };

        // Добавляем специфичные поля в зависимости от типа задачи
        const taskType = formData.get('task_type');
        if (taskType === 'daily') {
            taskData.date = formData.get('date');
        } else if (taskType === 'weekly') {
            taskData.week_start = formData.get('date');
        }

        try {
            const updatedTask = await this.sendTaskUpdate(taskData);
            this.updateTaskInDOM(updatedTask);
            this.closeModal('task-detail-modal');
            this.updateStatistics();
            showNotification('Задача обновлена!', 'success');
        } catch (error) {
            this.handleError('Error updating task:', error, 'Ошибка обновления задачи');
        }
    }

    // API взаимодействие
    async sendCreateTask(taskData) {
        const response = await fetch(this.config.endpoints.createTask, {
            method: 'POST',
            headers: this.getRequestHeaders(),
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Create failed');
        return await response.json();
    }

    async sendTaskUpdate(taskData) {
        const endpoint = `${this.config.endpoints.updateTask}/${taskData.id}/update/`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.getRequestHeaders(),
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Update failed');
        return await response.json();
    }

    async sendDeleteRequest(taskId) {
        const response = await fetch(`${this.config.endpoints.deleteTask}/${taskId}/delete/`, {
            method: 'POST',
            headers: this.getRequestHeaders()
        });
        if (!response.ok) throw new Error('Delete failed');
        return await response.json();
    }

    // Удаление задач
    prepareDeleteTask(taskId) {
        this.taskToDelete = taskId;
        this.openModal('confirm-modal');
    }

    async deleteTask() {
        if (!this.taskToDelete) return;

        try {
            await this.sendDeleteRequest(this.taskToDelete);
            this.removeTaskFromDOM(this.taskToDelete);
            this.closeModal('confirm-modal');
            this.updateStatistics();
            showNotification('Задача удалена!', 'success');
            this.taskToDelete = null;
        } catch (error) {
            this.handleError('Error deleting task:', error, 'Ошибка удаления задачи');
        }
    }

    // Переключение статуса задачи
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

    // DOM манипуляции
    updateTaskInDOM(task) {
        const taskElement = document.querySelector(`${this.config.taskSelector}[data-task-id="${task.id}"]`);
        if (!taskElement) return;

        taskElement.querySelector('.task-title').textContent = task.title;
        taskElement.classList.toggle('done', task.is_done);
        this.updateTaskDescription(taskElement, task.description);
    }

    updateTaskDescription(taskElement, description) {
        let descriptionEl = taskElement.querySelector('.task-description');
        if (description) {
            if (!descriptionEl) {
                descriptionEl = document.createElement('div');
                descriptionEl.className = 'task-description';
                taskElement.appendChild(descriptionEl);
            }
            descriptionEl.textContent = description;
        } else if (descriptionEl) {
            descriptionEl.remove();
        }
    }

    removeTaskFromDOM(taskId) {
        const taskElement = document.querySelector(`${this.config.taskSelector}[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.remove();
            this.allTasks = this.allTasks.filter(t => t.id !== taskId);
        }
    }

    updateTasksDisplay(tasks, taskData) {
        const container = this.getTaskContainer(taskData.date || taskData.week_start);
        if (!container) return;

        container.innerHTML = '';
        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            container.appendChild(taskElement);
        });

        this.allTasks = this.extractTasksFromDOM();
        this.updateStatistics();
    }

    displayTasks(tasks, dates = null) {
        this.allTasks = [];

        // Очищаем существующие задачи этого типа
        document.querySelectorAll(this.config.taskSelector).forEach(task => task.remove());

        tasks.forEach(task => this.addTaskToDOM(task));
        this.updateStatistics();
    }

    addTaskToDOM(task) {
        const taskElement = this.createTaskElement(task);
        const dateKey = task.date || task.week_start;
        const container = this.getTaskContainer(dateKey);

        if (container) {
            container.appendChild(taskElement);
            this.allTasks.push({
                id: task.id,
                date: new Date(dateKey),
                element: taskElement
            });
        }
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task ${this.config.type === 'weekly' ? 'weekly-task' : ''} ${task.is_done ? 'done' : ''}`;
        li.dataset.taskId = task.id;
        li.innerHTML = `
            <div class="task-main">
                <span class="task-title">${this.escapeHtml(task.title)}</span>
                <div class="task-actions">
                    <button class="task-toggle" title="Отметить выполненной">✓</button>
                    <button class="task-edit" title="Редактировать">✎</button>
                    <button class="task-delete" title="Удалить">×</button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
        `;
        return li;
    }

    extractTasksFromDOM() {
        return Array.from(document.querySelectorAll(this.config.taskSelector)).map(taskElement => {
            return {
                id: taskElement.dataset.taskId,
                element: taskElement
            };
        });
    }

    // Вспомогательные методы
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
        console.error(consoleMsg, error);
        showNotification(userMsg, 'error');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStatistics() {
        // Базовая реализация - можно переопределить в дочерних классах
        const doneTasksCount = document.querySelectorAll(`${this.config.taskSelector}.done`).length;
        const totalTasksCount = document.querySelectorAll(this.config.taskSelector).length;

        console.log(`${this.config.type} tasks: ${doneTasksCount}/${totalTasksCount} done`);
    }
}