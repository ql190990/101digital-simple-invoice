"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayInTimezone = getTodayInTimezone;
exports.formatDateKey = formatDateKey;
function getTodayInTimezone(timeZone, now = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const [year, month, day] = formatter.format(now).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}
function formatDateKey(date) {
    return date.toISOString().slice(0, 10);
}
//# sourceMappingURL=date.util.js.map