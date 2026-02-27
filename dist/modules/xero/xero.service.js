"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XeroService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class XeroService {
    static createInvoice(input) {
        const ts = Date.now().toString();
        const suffix = crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        return {
            invoiceId: `xero_inv_${suffix}`,
            invoiceNumber: `HRM8-${input.currency}-${ts.slice(-6)}-${suffix}`,
            status: 'AUTHORISED',
        };
    }
    static createCreditNote(_invoiceId, _amount, _currency) {
        return {
            creditNoteId: `xero_cn_${crypto_1.default.randomUUID().replace(/-/g, '')}`,
            status: 'AUTHORISED',
        };
    }
}
exports.XeroService = XeroService;
