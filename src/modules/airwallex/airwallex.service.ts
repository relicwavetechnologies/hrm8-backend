import crypto from 'crypto';
import { env } from '../../config/env';
import { BILLING_PROVIDER_MODE } from '../../config/billing-env';
import { Logger } from '../../utils/logger';

const log = Logger.create('airwallex');

export interface AirwallexCheckoutInput {
  amount: number;
  currency: string;
  reference: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface AirwallexCheckoutSession {
  paymentAttemptId: string;
  checkoutUrl: string;
  providerTransactionId: string;
}

export interface AirwallexRefund {
  refundId: string;
  status: 'PENDING' | 'COMPLETED';
}

const appendQuery = (url: string, params: Record<string, string>) => {
  const parsed = new URL(url);
  Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, value));
  return parsed.toString();
};

function buildIdempotencyKey(input: AirwallexCheckoutInput): string {
  const parts = [
    input.metadata?.companyId ?? '',
    input.reference,
    String(input.amount),
    input.currency,
    input.metadata?.priceBookVersion ?? '',
    input.metadata?.type ?? 'checkout',
  ].join('|');
  return crypto.createHash('sha256').update(parts).digest('hex');
}

async function liveAuth(): Promise<string> {
  const res = await fetch(`${process.env.AIRWALLEX_API_BASE_URL}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.AIRWALLEX_CLIENT_ID!,
      'x-api-key': process.env.AIRWALLEX_API_KEY!,
    },
  });
  if (!res.ok) throw new Error(`Airwallex auth failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

export class AirwallexService {
  static createCheckoutSession(input: AirwallexCheckoutInput): AirwallexCheckoutSession {
    if (BILLING_PROVIDER_MODE === 'live') {
      return this.createLiveCheckoutSession(input);
    }
    return this.createMockCheckoutSession(input);
  }

  static createRefund(paymentAttemptId: string): AirwallexRefund {
    if (BILLING_PROVIDER_MODE === 'live') {
      return this.createLiveRefund(paymentAttemptId);
    }
    return this.createMockRefund(paymentAttemptId);
  }

  static parseWebhook(event: unknown): {
    paymentAttemptId?: string;
    status?: 'SUCCEEDED' | 'FAILED';
    providerTransactionId?: string;
  } {
    if (!event || typeof event !== 'object') return {};

    const payload = event as Record<string, unknown>;
    const data = (payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload) as Record<string, unknown>;

    const paymentAttemptId =
      typeof data.paymentAttemptId === 'string'
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

    const providerTransactionId =
      typeof data.providerTransactionId === 'string'
        ? data.providerTransactionId
        : typeof data.transaction_id === 'string'
          ? data.transaction_id
          : undefined;

    return { paymentAttemptId, status, providerTransactionId };
  }

  static verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (BILLING_PROVIDER_MODE !== 'live') return true;

    const secret = process.env.AIRWALLEX_WEBHOOK_SECRET;
    if (!secret) {
      log.error('AIRWALLEX_WEBHOOK_SECRET not set – cannot verify webhook');
      return false;
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  /* ── Mock implementations ─────────────────────────────────── */

  private static createMockCheckoutSession(input: AirwallexCheckoutInput): AirwallexCheckoutSession {
    const paymentAttemptId = `awx_pay_${crypto.randomUUID().replace(/-/g, '')}`;
    const providerTransactionId = `awx_txn_${crypto.randomUUID().replace(/-/g, '')}`;

    const fallbackSuccessUrl = `${env.ATS_FRONTEND_URL}/subscriptions`;
    const checkoutUrl = appendQuery(input.successUrl || fallbackSuccessUrl, {
      payment_provider: 'airwallex',
      payment_attempt_id: paymentAttemptId,
      payment_status: 'success',
    });

    return { paymentAttemptId, checkoutUrl, providerTransactionId };
  }

  private static createMockRefund(_paymentAttemptId: string): AirwallexRefund {
    return {
      refundId: `awx_ref_${crypto.randomUUID().replace(/-/g, '')}`,
      status: 'COMPLETED',
    };
  }

  /* ── Live implementations ─────────────────────────────────── */

  private static createLiveCheckoutSession(input: AirwallexCheckoutInput): AirwallexCheckoutSession {
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
    const paymentAttemptId = `awx_live_${crypto.randomUUID().replace(/-/g, '')}`;
    const providerTransactionId = `awx_txn_${crypto.randomUUID().replace(/-/g, '')}`;
    const checkoutUrl = appendQuery(input.successUrl, {
      payment_provider: 'airwallex',
      payment_attempt_id: paymentAttemptId,
      payment_status: 'pending',
    });

    return { paymentAttemptId, checkoutUrl, providerTransactionId };
  }

  private static createLiveRefund(paymentAttemptId: string): AirwallexRefund {
    log.info('Creating live refund', { paymentAttemptId });

    /**
     * Live call:
     *   POST ${AIRWALLEX_API_BASE_URL}/api/v1/pa/refunds/create
     *   Body: { payment_intent_id, amount, reason }
     */
    return {
      refundId: `awx_ref_live_${crypto.randomUUID().replace(/-/g, '')}`,
      status: 'PENDING',
    };
  }
}
