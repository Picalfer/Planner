export const MONTH_NAMES = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export const DAY_NAMES = [
    'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
];

/**
 * Форматирует дату в строку вида "день месяц"
 * @param {Date} date - Дата для форматирования
 * @returns {string} Отформатированная дата
 */
export function formatDate(date) {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

/**
 * Форматирует дату в строку вида "день месяц год"
 * @param {Date} date - Дата для форматирования
 * @returns {string} Отформатированная дата
 */
export function formatDateWithYear(date) {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Форматирует диапазон дат недели
 * @param {Date} startDate - Начало недели
 * @param {Date} endDate - Конец недели
 * @returns {string} Отформатированный диапазон
 */
export function formatWeekRange(startDate, endDate) {
    if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.getDate()}—${formatDateWithYear(endDate)}`;
    } else {
        return `${formatDateWithYear(startDate)} — ${formatDateWithYear(endDate)}`;
    }
}