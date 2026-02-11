/**
 * Stripe Types
 * Common interfaces for both real and mock Stripe clients
 */

export interface StripeAccount {
  id: string;
  object: 'account';
  type: 'express' | 'standard' | 'custom';
  country: string;
  email: string;
  details_submitted: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  capabilities?: any;
  metadata?: Record<string, string>;
  created: number;
}

export interface StripeAccountLink {
  object: 'account_link';
  created: number;
  expires_at: number;
  url: string;
}

export interface StripeCheckoutSession {
  id: string;
  object: 'checkout.session';
  url: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'complete' | 'expired' | 'open';
  amount_total: number;
  currency: string;
  metadata?: Record<string, string>;
  customer_email?: string;
}

export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
}

/**
 * Interface that both Real and Mock Stripe clients must implement
 */
export interface IStripeClient {
  accounts: {
    create: (params: {
      type: 'express' | 'standard' | 'custom';
      country?: string;
      email?: string;
      capabilities?: any;
      metadata?: Record<string, string>;
    }) => Promise<StripeAccount>;
    retrieve: (accountId: string) => Promise<StripeAccount>;
  };

  accountLinks: {
    create: (params: {
      account: string;
      refresh_url: string;
      return_url: string;
      type: 'account_onboarding' | 'account_update';
    }) => Promise<StripeAccountLink>;
  };

  checkout: {
    sessions: {
      create: (params: {
        mode: 'payment' | 'subscription';
        payment_method_types?: string[];
        line_items?: any[];
        success_url: string;
        cancel_url: string;
        metadata?: Record<string, string>;
        customer_email?: string;
      }) => Promise<StripeCheckoutSession>;
      retrieve: (sessionId: string) => Promise<StripeCheckoutSession>;
    };
  };
}

/**
 * Checkout session creation params
 */
export interface CreateCheckoutSessionParams {
  amount: number;
  description: string;
  currency?: string;  // Added for multi-currency support
  metadata?: Record<string, string>;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Webhook event data
 */
export interface WebhookEventData {
  type: string;
  data: {
    object: any;
  };
}
