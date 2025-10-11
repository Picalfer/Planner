import {BaseTaskManager} from './baseTaskManager.js';

export class DailyTaskManager extends BaseTaskManager {
    constructor(weekManager) {
        const config = {
            type: 'daily',
            addButtonSelector: '.add-task-btn',
            taskSelector: '.task:not(.weekly-task)',
            createModalId: 'task-modal',
            createFormId: 'task-form',
            endpoints: {
                createTask: '/api/tasks/daily/create/',
                getTask: '/api/tasks/daily',
                updateTask: '/api/tasks/daily',
                deleteTask: '/api/tasks/daily'
            }
        };
        super(weekManager, config);
    }

    getTaskContainer(date) {
        return document.querySelector(`.add-task-btn[data-date="${date}"]`)?.closest('.day-card')
            ?.querySelector('.task-list');
    }

    formatTaskDataForAPI(formData) {
        return {
            title: formData.get('title'),
            description: formData.get('description'),
            date: formData.get('date'),
            is_done: false
        };
    }

    openCreateModal(e) {
        document.getElementById('task-date').value = e.target.dataset.date;
        this.openModal('task-modal');
    }
}