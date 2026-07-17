"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMoneyNumber = toMoneyNumber;
const decimal_js_1 = require("decimal.js");
function toMoneyNumber(value) {
    return Number(new decimal_js_1.Decimal(value.toString()).toFixed(2));
}
//# sourceMappingURL=decimal.util.js.map