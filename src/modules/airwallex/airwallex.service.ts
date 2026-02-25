import crypto from 'crypto';
import { env } from '../../config/env';

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

export class AirwallexService {
  static createCheckoutSession(input: AirwallexCheckoutInput): AirwallexCheckoutSession {
    const paymentAttemptId = `awx_pay_${crypto.randomUUID().replace(/-/g, '')}`;
    const providerTransactionId = `awx_txn_${crypto.randomUUID().replace(/-/g, '')}`;

    const fallbackSuccessUrl = `${env.ATS_FRONTEND_URL}/subscriptions`;
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

  static createRefund(_paymentAttemptId: string): AirwallexRefund {
    return {
      refundId: `awx_ref_${crypto.randomUUID().replace(/-/g, '')}`,
      status: 'COMPLETED',
    };
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
}
