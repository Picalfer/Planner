import {WeekManager} from "./weekManager";


export class CalendarManager {
    constructor() {
        this.weekManager = new WeekManager();

        this.setupEventListeners()
    }

    setupEventListeners() {
        document.getElementById('prev-week').addEventListener('click', () => {
            console.log(1)
        });

        document.getElementById('next-week').addEventListener('click', () => {
            console.log(2)
        });

        document.getElementById('current-week').addEventListener('click', () => {
            console.log(3)
        });
    }
}
