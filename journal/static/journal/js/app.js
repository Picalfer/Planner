import {WeekManager} from './weekManager.js';
import {TaskManager} from './taskManager.js';

class DailyPlannerApp {
    constructor() {
        this.weekManager = new WeekManager();
        this.taskManager = new TaskManager();
        this.setupEventListeners();
        this.init();
    }

    init() {
        console.log("Daily Planner initialized");
        this.updateDisplay();
    }

    setupEventListeners() {
        document.getElementById('prev-week').addEventListener('click', () => {
            this.prevWeek();
        });

        document.getElementById('next-week').addEventListener('click', () => {
            this.nextWeek();
        });

        document.getElementById('current-week').addEventListener('click', () => {
            this.goToCurrentWeek();
        });
    }

    prevWeek() {
        this.weekManager.currentWeekOffset--;
        this.updateDisplay();
    }

    nextWeek() {
        this.weekManager.currentWeekOffset++;
        this.updateDisplay();
    }

    goToCurrentWeek() {
        if (this.weekManager.currentWeekOffset !== 0) {
            this.weekManager.currentWeekOffset = 0;
            this.updateDisplay();
        }
    }

    updateDisplay() {
        const currentWeekDates = this.weekManager.getCurrentWeekDates();
        this.weekManager.updateWeekInfo();
        this.taskManager.filterTasksForWeek(currentWeekDates);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    new DailyPlannerApp();
});