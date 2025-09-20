export class TaskManager {
    constructor() {
        this.allTasks = this.extractTasksFromDOM();
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

        // Сначала скрываем все задачи
        this.allTasks.forEach(task => {
            task.element.style.display = 'none';
        });

        // Показываем только задачи текущей недели
        this.allTasks.forEach(task => {
            const taskDateStr = task.date.toISOString().split('T')[0];
            const shouldShow = dateStrings.includes(taskDateStr);

            if (shouldShow) {
                task.element.style.display = 'block';

                // Перемещаем задачу в правильный день (на случай если дата изменилась)
                const correctDayIndex = dateStrings.indexOf(taskDateStr);
                const dayCards = document.querySelectorAll('.day-card');
                const taskList = dayCards[correctDayIndex]?.querySelector('.task-list');

                if (taskList && !taskList.contains(task.element)) {
                    taskList.appendChild(task.element);
                }
            }
        });

        // Обновляем статистику задач для каждого дня
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
}