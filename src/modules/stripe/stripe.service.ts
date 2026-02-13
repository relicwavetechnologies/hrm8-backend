/**
 * Stripe Service
 * Business logic for Stripe operations
 */

import { StripeFactory } from './stripe.factory';
import { CreateCheckoutSessionParams, StripeCheckoutSession } from './stripe.types';
import { WalletService } from '../wallet/wallet.service';
import { prisma } from '../../utils/prisma';
import { Logger } from '../../utils/logger';

export class StripeService {
  private static logger = Logger.create('stripe:service');
  /**
   * Create a checkout session for wallet recharge with multi-currency support
   */
  static async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    sessionId: string;
    url: string;
  }> {
    const stripe = StripeFactory.getClient();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

    const {
      amount,
      description,
      currency = 'usd',  // ✅ Multi-currency support
      metadata = {},
      customerEmail,
      successUrl,
      cancelUrl,
    } = params;

    // Validate amount (must be positive integer in cents)
    if (amount <= 0 || !Number.isInteger(amount)) {
      throw new Error('Amount must be a positive integer in cents');
    }

    // Convert to cents if needed (Stripe expects cents)
    const amountInCents = amount;
    
    // Currency symbol mapping
    const currencySymbols: Record<string, string> = {
      'usd': '$',
      'aud': 'A$',
      'gbp': '£',
      'eur': '€',
      'inr': '₹'
    };
    const symbol = currencySymbols[currency.toLowerCase()] || currency.toUpperCase();

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),  // ✅ Dynamic currency
              product_data: {
                name: description || 'Wallet Recharge',
                description: `Add ${symbol}${(amountInCents / 100).toFixed(2)} to wallet`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        success_url: successUrl || `${frontendUrl}/wallet?recharge_success=true`,
        cancel_url: cancelUrl || `${frontendUrl}/wallet?recharge_cancelled=true`,
        metadata: {
          ...metadata,
          amount: amountInCents.toString(),
          currency: currency.toUpperCase(),  // ✅ Store for webhook
        },
        customer_email: customerEmail,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error: any) {
      this.logger.error('Failed to create checkout session', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Process completed checkout session webhook
   * Credits wallet or creates subscription based on payment type
   */
  static async processCheckoutCompleted(session: StripeCheckoutSession): Promise<void> {
    // Validate payment was successful
    if (session.payment_status !== 'paid') {
      return;
    }

    const metadata = session.metadata || {};
    const paymentType = metadata.type || 'unknown';
    const companyId = metadata.companyId;
    const userId = metadata.userId;

    if (!companyId) {
      throw new Error('Missing companyId in session metadata');
    }

    if (paymentType === 'wallet_recharge') {
      const timer = this.logger.startTimer();
      await this.creditWalletFromPayment(session, companyId, userId);
      timer.end('Wallet credited', { companyId, amount: session.amount_total / 100 });
    } else if (paymentType === 'subscription_purchase') {
      const timer = this.logger.startTimer();
      await this.createSubscriptionFromPayment(session, companyId);
      timer.end('Subscription created', { companyId, planType: metadata.planType });
    } else {
      this.logger.warn('Unknown payment type', { paymentType, sessionId: session.id });
    }
  }

  /**
   * Create subscription from successful Stripe payment
   */
  private static async createSubscriptionFromPayment(
    session: StripeCheckoutSession,
    companyId: string
  ): Promise<void> {
    const metadata = session.metadata || {};
    const planType = metadata.planType || 'PAYG';
    const name = metadata.planName || metadata.name || planType;
    const basePrice = session.amount_total / 100;
    const billingCycle = (metadata.billingCycle || 'MONTHLY') as 'MONTHLY' | 'ANNUAL';
    const jobQuota = metadata.jobQuota ? parseInt(metadata.jobQuota, 10) : undefined;

    const { SubscriptionService } = await import('../subscription/subscription.service');
    await SubscriptionService.createSubscription({
      companyId,
      planType: planType as any,
      name,
      basePrice,
      billingCycle,
      jobQuota: jobQuota || null,
      autoRenew: true,
    });
  }

  /**
   * Credit wallet account from successful payment
   */
  private static async creditWalletFromPayment(
    session: StripeCheckoutSession,
    companyId: string,
    userId?: string
  ): Promise<void> {
    const amountInDollars = session.amount_total / 100;

    // Get or create wallet account
    const account = await WalletService.getOrCreateAccount('COMPANY', companyId);

    // Credit the wallet (atomic transaction)
    await WalletService.creditAccount({
      accountId: account.id,
      amount: amountInDollars,
      type: 'TRANSFER_IN',
      description: `Stripe payment - Session ${session.id}`,
      referenceId: session.id,
      referenceType: 'stripe_session',
      createdBy: userId,
    });
  }

  /**
   * Retrieve a checkout session
   */
  static async retrieveSession(sessionId: string): Promise<StripeCheckoutSession> {
    const stripe = StripeFactory.getClient();

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session as StripeCheckoutSession;
    } catch (error: any) {
      this.logger.error('Failed to retrieve session', { sessionId, error: error.message });
      throw new Error(`Session not found: ${sessionId}`);
    }
  }

  /**
   * Validate webhook signature (for real Stripe only)
   * Mock Stripe uses X-Mock-Stripe-Event header instead
   */
  static validateWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): any {
    if (StripeFactory.isUsingMock()) {
      // Mock Stripe doesn't have signatures
      return JSON.parse(payload.toString());
    }

    // Use real Stripe to validate
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }
}
