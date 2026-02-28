"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirwallexService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const billing_env_1 = require("../../config/billing-env");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('airwallex');
const appendQuery = (url, params) => {
    const parsed = new URL(url);
    Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, value));
    return parsed.toString();
};
function buildIdempotencyKey(input) {
    const parts = [
        input.metadata?.companyId ?? '',
        input.reference,
        String(input.amount),
        input.currency,
        input.metadata?.priceBookVersion ?? '',
        input.metadata?.type ?? 'checkout',
    ].join('|');
    return crypto_1.default.createHash('sha256').update(parts).digest('hex');
}
async function liveAuth() {
    const res = await fetch(`${process.env.AIRWALLEX_API_BASE_URL}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': process.env.AIRWALLEX_CLIENT_ID,
            'x-api-key': process.env.AIRWALLEX_API_KEY,
        },
    });
    if (!res.ok)
        throw new Error(`Airwallex auth failed: ${res.status}`);
    const data = await res.json();
    return data.token;
}
class AirwallexService {
    static createCheckoutSession(input) {
        if (billing_env_1.BILLING_PROVIDER_MODE === 'live') {
            return this.createLiveCheckoutSession(input);
        }
        return this.createMockCheckoutSession(input);
    }
    static createRefund(paymentAttemptId) {
        if (billing_env_1.BILLING_PROVIDER_MODE === 'live') {
            return this.createLiveRefund(paymentAttemptId);
        }
        return this.createMockRefund(paymentAttemptId);
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
    static verifyWebhookSignature(rawBody, signature) {
        if (billing_env_1.BILLING_PROVIDER_MODE !== 'live')
            return true;
        const secret = process.env.AIRWALLEX_WEBHOOK_SECRET;
        if (!secret) {
            log.error('AIRWALLEX_WEBHOOK_SECRET not set – cannot verify webhook');
            return false;
        }
        const expected = crypto_1.default.createHmac('sha256', secret).update(rawBody).digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }
    /* ── Mock implementations ─────────────────────────────────── */
    static createMockCheckoutSession(input) {
        const paymentAttemptId = `awx_pay_${crypto_1.default.randomUUID().replace(/-/g, '')}`;
        const providerTransactionId = `awx_txn_${crypto_1.default.randomUUID().replace(/-/g, '')}`;
        const fallbackSuccessUrl = `${env_1.env.ATS_FRONTEND_URL}/subscriptions`;
        const checkoutUrl = appendQuery(input.successUrl || fallbackSuccessUrl, {
            payment_provider: 'airwallex',
            payment_attempt_id: paymentAttemptId,
            payment_status: 'success',
        });
        return { paymentAttemptId, checkoutUrl, providerTransactionId };
    }
    static createMockRefund(_paymentAttemptId) {
        return {
            refundId: `awx_ref_${crypto_1.default.randomUUID().replace(/-/g, '')}`,
            status: 'COMPLETED',
        };
    }
    /* ── Live implementations ─────────────────────────────────── */
    static createLiveCheckoutSession(input) {
        const idempotencyKey = buildIdempotencyKey(input);
        log.info('Creating live checkout session', { idempotencyKey, amount: input.amount, currency: input.currency });
        /**
         * In a fully wired production environment this would call:
         *
         *   POST ${AIRWALLEX_API_BASE_URL}/api/v1/pa/payment_intents/create
         *   Headers: Authorization: Bearer <token>, x-idempotency-key: <key>
         *   Body: { amount, currency, merchant_order_id, metadata, return_url, ... }
         *
         * For now we prepare the shape but still return mock IDs so the
         * service can be validated end-to-end in staging before going fully
         * live. Set BILLING_AUTO_CONFIRM=false in staging to exercise the
         * async payment path.
         */
        const paymentAttemptId = `awx_live_${crypto_1.default.randomUUID().replace(/-/g, '')}`;
        const providerTransactionId = `awx_txn_${crypto_1.default.randomUUID().replace(/-/g, '')}`;
        const checkoutUrl = appendQuery(input.successUrl, {
            payment_provider: 'airwallex',
            payment_attempt_id: paymentAttemptId,
            payment_status: 'pending',
        });
        return { paymentAttemptId, checkoutUrl, providerTransactionId };
    }
    static createLiveRefund(paymentAttemptId) {
        log.info('Creating live refund', { paymentAttemptId });
        /**
         * Live call:
         *   POST ${AIRWALLEX_API_BASE_URL}/api/v1/pa/refunds/create
         *   Body: { payment_intent_id, amount, reason }
         */
        return {
            refundId: `awx_ref_live_${crypto_1.default.randomUUID().replace(/-/g, '')}`,
            status: 'PENDING',
        };
    }
}
exports.AirwallexService = AirwallexService;
