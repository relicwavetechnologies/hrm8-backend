/**
 * Mock Stripe Client
 * Simulates Stripe operations for development/testing
 * Provides exact same interface as real Stripe client
 */

import {
  IStripeClient,
  StripeAccount,
  StripeAccountLink,
  StripeCheckoutSession,
  WebhookEventData,
} from './stripe.types';
import { Logger } from '../../utils/logger';

// In-memory storage for mock data
const mockAccounts = new Map<string, StripeAccount>();
const mockSessions = new Map<string, StripeCheckoutSession>();
const logger = Logger.create('stripe:mock');

/**
 * Simulate webhook event by calling backend webhook endpoint
 */
async function simulateWebhook(event: WebhookEventData, delayMs: number = 1500): Promise<void> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const webhookUrl = `${backendUrl}/api/integrations/stripe/webhook`;

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, delayMs));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Stripe-Event': 'true', // Flag to bypass signature verification
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('Webhook delivery failed', { status: response.status, response: text });
    }
  } catch (error) {
    logger.error('Webhook delivery error', error);
  }
}

/**
 * Mock Stripe Client Implementation
 */
export class MockStripeClient implements IStripeClient {
  accounts = {
    /**
     * Create a mock Stripe Connect account
     */
    create: async (params: {
      type: 'express' | 'standard' | 'custom';
      country?: string;
      email?: string;
      capabilities?: any;
      metadata?: Record<string, string>;
    }): Promise<StripeAccount> => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const accountId = `acct_mock_${timestamp}_${random}`;

      const account: StripeAccount = {
        id: accountId,
        object: 'account',
        type: params.type,
        country: params.country || 'US',
        email: params.email || 'mock@example.com',
        details_submitted: false,
        payouts_enabled: false,
        charges_enabled: false,
        capabilities: params.capabilities,
        metadata: params.metadata,
        created: Math.floor(Date.now() / 1000),
      };

      mockAccounts.set(accountId, account);

      // Auto-approve if configured
      if (process.env.MOCK_STRIPE_AUTO_APPROVE === 'true') {
        setTimeout(() => {
          const acc = mockAccounts.get(accountId);
          if (acc) {
            acc.details_submitted = true;
            acc.payouts_enabled = true;
            acc.charges_enabled = true;
            mockAccounts.set(accountId, acc);
          }
        }, 2000);
      }

      return account;
    },

    /**
     * Retrieve a mock Stripe account
     */
    retrieve: async (accountId: string): Promise<StripeAccount> => {
      const account = mockAccounts.get(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      return account;
    },
  };

  accountLinks = {
    /**
     * Create a mock account onboarding link
     */
    create: async (params: {
      account: string;
      refresh_url: string;
      return_url: string;
      type: 'account_onboarding' | 'account_update';
    }): Promise<StripeAccountLink> => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

      const mockOnboardingUrl =
        `${frontendUrl}/dev/stripe-mock-onboarding?` +
        `account_id=${params.account}&` +
        `return_url=${encodeURIComponent(params.return_url)}&` +
        `refresh_url=${encodeURIComponent(params.refresh_url)}`;

      return {
        object: 'account_link',
        created: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 300,
        url: mockOnboardingUrl,
      };
    },
  };

  checkout = {
    sessions: {
      /**
       * Create a mock checkout session
       */
      create: async (params: {
        mode: 'payment' | 'subscription';
        payment_method_types?: string[];
        line_items?: any[];
        success_url: string;
        cancel_url: string;
        metadata?: Record<string, string>;
        customer_email?: string;
      }): Promise<StripeCheckoutSession> => {
        const sessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

        // Calculate total amount from line items
        let amount_total = 0;
        if (params.line_items && params.line_items.length > 0) {
          params.line_items.forEach((item) => {
            if (item.price_data) {
              amount_total += item.price_data.unit_amount * (item.quantity || 1);
            }
          });
        }

        const session: StripeCheckoutSession = {
          id: sessionId,
          object: 'checkout.session',
          url: `${frontendUrl}/dev/stripe-mock-checkout?session_id=${sessionId}&amount=${amount_total}`,
          payment_status: 'unpaid', // Starts as unpaid until user "pays"
          status: 'open',
          amount_total,
          currency: 'usd',
          metadata: params.metadata,
          customer_email: params.customer_email,
        };

        // Store session
        mockSessions.set(sessionId, session);

        // Note: Webhook will be triggered manually via /mock-payment-success endpoint
        // This allows user to see the mock checkout UI and click "Pay" button

        return session;
      },

      /**
       * Retrieve a mock checkout session
       */
      retrieve: async (sessionId: string): Promise<StripeCheckoutSession> => {
        const session = mockSessions.get(sessionId);
        if (!session) {
          throw new Error(`Session not found: ${sessionId}`);
        }
        return session;
      },
    },
  };
}

/**
 * Manually complete a mock payment and trigger webhook
 * Called by /api/integrations/stripe/mock-payment-success endpoint
 */
export async function completeMockPayment(sessionId: string): Promise<void> {
  const session = mockSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Update session to completed
  session.payment_status = 'paid';
  session.status = 'complete';
  mockSessions.set(sessionId, session);

  // Trigger webhook with realistic delay
  await simulateWebhook(
    {
      type: 'checkout.session.completed',
      data: { object: session },
    },
    1500 // 1.5 second delay to simulate real Stripe
  );
}

/**
 * Get a mock session (for debugging/testing)
 */
export function getMockSession(sessionId: string): StripeCheckoutSession | undefined {
  return mockSessions.get(sessionId);
}

/**
 * Get all mock sessions (for debugging)
 */
export function getAllMockSessions(): Map<string, StripeCheckoutSession> {
  return mockSessions;
}

/**
 * Manually approve a mock account (for testing)
 */
export function approveMockAccount(accountId: string): void {
  const account = mockAccounts.get(accountId);
  if (account) {
    account.details_submitted = true;
    account.payouts_enabled = true;
    account.charges_enabled = true;
    mockAccounts.set(accountId, account);
  }
}

/**
 * Get all mock accounts (for debugging)
 */
export function getAllMockAccounts(): Map<string, StripeAccount> {
  return mockAccounts;
}
