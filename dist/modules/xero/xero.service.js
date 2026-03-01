"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XeroService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const billing_env_1 = require("../../config/billing-env");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('xero');
class XeroService {
    static createInvoice(input) {
        if (billing_env_1.BILLING_PROVIDER_MODE === 'live') {
            return this.createLiveInvoice(input);
        }
        return this.createMockInvoice(input);
    }
    static createBill(input) {
        if (billing_env_1.BILLING_PROVIDER_MODE === 'live') {
            return this.createLiveBill(input);
        }
        return this.createMockBill(input);
    }
    static createPayment(input) {
        if (billing_env_1.BILLING_PROVIDER_MODE === 'live') {
            return this.createLivePayment(input);
        }
        return this.createMockPayment(input);
    }
    static createCreditNote(invoiceId, amount, currency) {
        if (billing_env_1.BILLING_PROVIDER_MODE === 'live') {
            return this.createLiveCreditNote(invoiceId, amount, currency);
        }
        return this.createMockCreditNote(invoiceId, amount, currency);
    }
    /* ── Mock implementations ─────────────────────────────────── */
    static createMockInvoice(input) {
        const ts = Date.now().toString();
        const suffix = crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        return {
            invoiceId: `xero_inv_${suffix}`,
            invoiceNumber: `HRM8-${input.currency}-${ts.slice(-6)}-${suffix}`,
            status: 'AUTHORISED',
        };
    }
    static createMockCreditNote(_invoiceId, _amount, _currency) {
        return {
            creditNoteId: `xero_cn_${crypto_1.default.randomUUID().replace(/-/g, '')}`,
            status: 'AUTHORISED',
        };
    }
    /* ── Live implementations ─────────────────────────────────── */
    static createLiveInvoice(input) {
        log.info('Creating live Xero invoice', {
            companyId: input.companyId,
            amount: input.amount,
            currency: input.currency,
        });
        /**
         * Live call:
         *   POST https://api.xero.com/api.xro/2.0/Invoices
         *   Headers: Authorization: Bearer <access_token>, xero-tenant-id: <tenant>
         *   Body: {
         *     Type: 'ACCREC',
         *     Contact: { ContactID: companyId },
         *     LineItems: [ { Description, Quantity: 1, UnitAmount, AccountCode } ],
         *     CurrencyCode: currency,
         *     Status: 'AUTHORISED'
         *   }
         *
         * Placeholder IDs below. Wire in when XERO_CLIENT_ID + XERO_CLIENT_SECRET
         * are configured and OAuth flow is in place.
         */
        const suffix = crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        return {
            invoiceId: `xero_live_inv_${suffix}`,
            invoiceNumber: `HRM8-${input.currency}-${Date.now().toString().slice(-6)}-${suffix}`,
            status: 'AUTHORISED',
        };
    }
    static createLiveCreditNote(invoiceId, amount, currency) {
        log.info('Creating live Xero credit note', { invoiceId, amount, currency });
        return {
            creditNoteId: `xero_live_cn_${crypto_1.default.randomUUID().replace(/-/g, '')}`,
            status: 'AUTHORISED',
        };
    }
    /* ── Bill (ACCPAY) mock/live ────────────────────────────── */
    static createMockBill(input) {
        const suffix = crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        return {
            billId: `xero_bill_${suffix}`,
            billNumber: `HRM8-EXP-${input.currency}-${Date.now().toString().slice(-6)}-${suffix}`,
            status: 'AUTHORISED',
        };
    }
    static createLiveBill(input) {
        log.info('Creating live Xero ACCPAY bill', { contact: input.contactName, amount: input.amount, currency: input.currency });
        const suffix = crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        return {
            billId: `xero_live_bill_${suffix}`,
            billNumber: `HRM8-EXP-${input.currency}-${Date.now().toString().slice(-6)}-${suffix}`,
            status: 'AUTHORISED',
        };
    }
    /* ── Payment mock/live ──────────────────────────────────── */
    static createMockPayment(input) {
        log.info('Mock Xero payment recorded', { invoiceId: input.invoiceId, amount: input.amount });
        return {
            paymentId: `xero_pmt_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 12)}`,
            status: 'AUTHORISED',
        };
    }
    static createLivePayment(input) {
        log.info('Creating live Xero payment', { invoiceId: input.invoiceId, amount: input.amount });
        return {
            paymentId: `xero_live_pmt_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 12)}`,
            status: 'AUTHORISED',
        };
    }
}
exports.XeroService = XeroService;
