"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCommissionRateDecimal = toCommissionRateDecimal;
exports.toCommissionRatePercent = toCommissionRatePercent;
/**
 * Commission rates are stored in DB as decimals (0.2 = 20%).
 * UI/API may send percentages (20). These helpers normalize both forms.
 */
function toCommissionRateDecimal(rate, fallbackDecimal = 0.2) {
    if (rate === null || rate === undefined || Number.isNaN(Number(rate))) {
        return fallbackDecimal;
    }
    const numeric = Number(rate);
    if (numeric <= 0) {
        return 0;
    }
    const decimal = numeric > 1 ? numeric / 100 : numeric;
    return Number(decimal.toFixed(6));
}
function toCommissionRatePercent(rate, fallbackPercent = 20) {
    const decimal = toCommissionRateDecimal(rate, fallbackPercent / 100);
    return Number((decimal * 100).toFixed(2));
}
