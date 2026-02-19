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
   * Create a checkout session for wallet recharge
   * POST /api/integrations/stripe/create-checkout-session
   */
  createCheckoutSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { amount, description, metadata, successUrl, cancelUrl } = req.body;
      const user = req.user;

      if (!user) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return this.sendError(res, new Error('Invalid amount'), 400);
      }

      // Convert dollars to cents for Stripe
      const amountInCents = Math.round(amount * 100);

      // Extract metadata from body or use provided metadata object
      const { type, planType, planName, billingCycle, jobQuota } = req.body;
      const resolvedType = type || metadata?.type || (planType ? 'subscription' : 'wallet_recharge');
      const mergedMetadata = {
        type: resolvedType,
        planType: planType || metadata?.planType,
        name: planName || metadata?.name || metadata?.planName,
        billingCycle: billingCycle || metadata?.billingCycle,
        jobQuota: jobQuota?.toString() || metadata?.jobQuota, // jobQuota must be string for Stripe metadata
        ...metadata,
        companyId: user.companyId,
        userId: user.id,
      };

      if (!mergedMetadata.companyId) {
        return this.sendError(res, new Error('Company context missing for checkout session'), 400);
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const defaultSuccessUrl = resolvedType === 'subscription'
        ? `${frontendUrl}/subscriptions?subscription_success=true`
        : `${frontendUrl}/wallet?recharge_success=true`;
      const defaultCancelUrl = resolvedType === 'subscription'
        ? `${frontendUrl}/subscriptions?canceled=true`
        : `${frontendUrl}/wallet?recharge_cancelled=true`;

      const session = await StripeService.createCheckoutSession({
        amount: amountInCents,
        description: description || `Wallet recharge - $${amount.toFixed(2)}`,
        metadata: mergedMetadata,
        customerEmail: user.email,
        successUrl: successUrl || defaultSuccessUrl,
        cancelUrl: cancelUrl || defaultCancelUrl,
      });

      this.logger.info('Checkout session created', {
        sessionId: session.sessionId,
        amount: amountInCents / 100,
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
