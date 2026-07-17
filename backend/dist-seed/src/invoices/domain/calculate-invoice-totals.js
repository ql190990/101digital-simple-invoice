"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = round2;
exports.calculateInvoiceTotals = calculateInvoiceTotals;
const decimal_js_1 = require("decimal.js");
const TWO_DP = 2;
function round2(value) {
    return value.toDecimalPlaces(TWO_DP, decimal_js_1.Decimal.ROUND_HALF_UP);
}
function calculateInvoiceTotals(input) {
    const subTotal = input.items.reduce((acc, item) => acc.plus(new decimal_js_1.Decimal(item.rate).times(item.quantity)), new decimal_js_1.Decimal(0));
    const taxPercent = new decimal_js_1.Decimal(input.taxPercent);
    const discount = new decimal_js_1.Decimal(input.discount);
    const totalPaid = new decimal_js_1.Decimal(input.totalPaid ?? 0);
    const subTotalRounded = round2(subTotal);
    const taxAmount = round2(subTotalRounded.times(taxPercent).dividedBy(100));
    const totalAmount = round2(subTotalRounded.plus(taxAmount).minus(discount));
    const balanceAmount = round2(totalAmount.minus(totalPaid));
    return {
        subTotal: subTotalRounded,
        taxAmount,
        totalAmount,
        balanceAmount,
    };
}
//# sourceMappingURL=calculate-invoice-totals.js.map