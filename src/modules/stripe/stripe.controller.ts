/**
 * Stripe Controller
 * HTTP handlers for Stripe operations
 */

import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { StripeService } from './stripe.service';
import { StripeFactory } from './stripe.factory';
import { completeMockPayment } from './stripe-mock.client';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    email: string;
  };
}

export class StripeController extends BaseController {
  constructor() {
    super('stripe');
  }

  /**
   * Create a checkout session for wallet recharge or subscription purchase
   * POST /api/integrations/stripe/create-checkout-session
   *
   * Body for wallet recharge: { amount, description?, metadata? }
   * Body for subscription: { type: 'subscription', amount, planType, planName?, billingCycle?, jobQuota?, description? }
   */
  createCheckoutSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { amount, description, metadata: bodyMetadata, type: paymentType, planType, planName, billingCycle, jobQuota } = req.body;
      const user = req.user;

      if (!user) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }

      if (!amount || (typeof amount !== 'number' && typeof amount !== 'string') || Number(amount) <= 0) {
        return this.sendError(res, new Error('Invalid amount'), 400);
      }

      const amountNum = typeof amount === 'number' ? amount : parseFloat(amount);
      const amountInCents = Math.round(amountNum * 100);

      const isSubscription = paymentType === 'subscription' || paymentType === 'subscription_purchase';
      const meta = {
        ...bodyMetadata,
        companyId: user.companyId,
        userId: user.id,
        type: isSubscription ? 'subscription_purchase' : 'wallet_recharge',
        ...(isSubscription && {
          planType: planType || 'PAYG',
          planName: planName || planType || 'Subscription',
          name: planName || planType || 'Subscription',
          billingCycle: billingCycle || 'MONTHLY',
          jobQuota: jobQuota != null ? String(jobQuota) : undefined,
        }),
      };

      const desc = description || (isSubscription
        ? `${meta.planName || meta.planType} - $${amountNum.toFixed(2)}`
        : `Wallet recharge - $${amountNum.toFixed(2)}`);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const successUrl = isSubscription
        ? `${frontendUrl}/subscriptions?subscription_success=true`
        : undefined;
      const cancelUrl = isSubscription
        ? `${frontendUrl}/subscriptions?subscription_cancelled=true`
        : undefined;

      const session = await StripeService.createCheckoutSession({
        amount: amountInCents,
        description: desc,
        metadata: meta,
        customerEmail: user.email,
        successUrl,
        cancelUrl,
      });

      this.logger.info('Checkout session created', {
        sessionId: session.sessionId,
        amount: amountInCents / 100,
        type: meta.type,
      });

      return this.sendSuccess(res, {
        sessionId: session.sessionId,
        url: session.url,
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Mock payment success endpoint
   * Only available when using mock Stripe
   * POST /api/integrations/stripe/mock-payment-success
   */
  mockPaymentSuccess = async (req: Request, res: Response) => {
    try {
      if (!StripeFactory.isUsingMock()) {
        return this.sendError(res, new Error('Mock endpoints only available in development mode'), 403);
      }

      const { sessionId } = req.body;

      if (!sessionId) {
        return this.sendError(res, new Error('sessionId is required'), 400);
      }

      // Complete the mock payment and trigger webhook
      await completeMockPayment(sessionId);

      return this.sendSuccess(res, {
        message: 'Mock payment completed and webhook triggered',
        sessionId,
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Stripe webhook handler
   * POST /api/integrations/stripe/webhook
   */
  handleWebhook = async (req: Request, res: Response) => {
    try {
      const isMockEvent = req.headers['x-mock-stripe-event'] === 'true';

      let event;

      if (isMockEvent) {
        // Mock Stripe event - no signature verification
        event = req.body;
      } else {
        // Real Stripe event - verify signature
        const signature = req.headers['stripe-signature'] as string;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
          throw new Error('STRIPE_WEBHOOK_SECRET not configured');
        }

        if (!signature) {
          throw new Error('Missing stripe-signature header');
        }

        // Verify signature and get event
        event = StripeService.validateWebhookSignature(
          req.body,
          signature,
          webhookSecret
        );
      }

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await StripeService.processCheckoutCompleted(event.data.object);
          this.logger.info('Webhook processed', { eventType: event.type });
          break;

        case 'checkout.session.expired':
          break;

        default:
      }

      // Always return 200 to acknowledge receipt
      return res.status(200).json({ received: true });
    } catch (error: any) {
      this.logger.error('Webhook processing failed', error);
      // Return 400 for webhook errors
      return res.status(400).json({
        error: error.message || 'Webhook processing failed',
      });
    }
  };

  /**
   * Approve mock Stripe account (DEV only)
   * POST /api/integrations/stripe/approve-mock-account
   */
  approveMockAccount = async (req: Request, res: Response) => {
    try {
      if (!StripeFactory.isUsingMock()) {
        return this.sendError(res, new Error('Only available in mock mode'), 403);
      }

      const { accountId } = req.body;
      if (!accountId) {
        return this.sendError(res, new Error('accountId required'), 400);
      }

      const { approveMockAccount } = await import('./stripe-mock.client');
      approveMockAccount(accountId);

      this.logger.info('Mock account approved', { accountId });

      return this.sendSuccess(res, {
        message: 'Mock account approved',
        accountId
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Get Stripe connection status
   * GET /api/integrations/stripe/status
   */
  getStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isMock = StripeFactory.isUsingMock();
      const clientType = StripeFactory.getClientType();

      return this.sendSuccess(res, {
        connected: true, // Always connected (mock or real)
        mode: clientType,
        isMock,
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
