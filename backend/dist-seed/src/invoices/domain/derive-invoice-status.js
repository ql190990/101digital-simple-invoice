"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveInvoiceStatus = deriveInvoiceStatus;
exports.toDateKey = toDateKey;
function deriveInvoiceStatus(status, dueDate, today) {
    if (status === 'Paid') {
        return 'Paid';
    }
    const dueDay = toDateKey(dueDate);
    const todayKey = toDateKey(today);
    if (dueDay < todayKey) {
        return 'Overdue';
    }
    return status;
}
function toDateKey(date) {
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
//# sourceMappingURL=derive-invoice-status.js.map