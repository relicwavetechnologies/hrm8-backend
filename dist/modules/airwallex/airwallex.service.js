"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirwallexService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const appendQuery = (url, params) => {
    const parsed = new URL(url);
    Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, value));
    return parsed.toString();
};
class AirwallexService {
    static createCheckoutSession(input) {
        const paymentAttemptId = `awx_pay_${crypto_1.default.randomUUID().replace(/-/g, '')}`;
        const providerTransactionId = `awx_txn_${crypto_1.default.randomUUID().replace(/-/g, '')}`;
        const fallbackSuccessUrl = `${env_1.env.ATS_FRONTEND_URL}/subscriptions`;
        const checkoutUrl = appendQuery(input.successUrl || fallbackSuccessUrl, {
            payment_provider: 'airwallex',
            payment_attempt_id: paymentAttemptId,
            payment_status: 'success',
        });
        return {
            paymentAttemptId,
            checkoutUrl,
            providerTransactionId,
        };
    }
    static createRefund(_paymentAttemptId) {
        return {
            refundId: `awx_ref_${crypto_1.default.randomUUID().replace(/-/g, '')}`,
            status: 'COMPLETED',
        };
    }
    static parseWebhook(event) {
        if (!event || typeof event !== 'object')
            return {};
        const payload = event;
        const data = (payload.data && typeof payload.data === 'object'
            ? payload.data
            : payload);
        const paymentAttemptId = typeof data.paymentAttemptId === 'string'
            ? data.paymentAttemptId
            : typeof data.payment_attempt_id === 'string'
                ? data.payment_attempt_id
                : undefined;
        const rawStatus = typeof data.status === 'string' ? data.status.toUpperCase() : undefined;
        const status = rawStatus === 'SUCCEEDED' || rawStatus === 'SUCCESS'
            ? 'SUCCEEDED'
            : rawStatus === 'FAILED'
                ? 'FAILED'
                : undefined;
        const providerTransactionId = typeof data.providerTransactionId === 'string'
            ? data.providerTransactionId
            : typeof data.transaction_id === 'string'
                ? data.transaction_id
                : undefined;
        return { paymentAttemptId, status, providerTransactionId };
    }
}
exports.AirwallexService = AirwallexService;
