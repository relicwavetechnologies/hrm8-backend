/**
 * Stripe Routes
 * API endpoints for Stripe integration
 */

import { Router } from 'express';
import { StripeController } from './stripe.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';


const router = Router();
const stripeController = new StripeController();

/**
 * Create checkout session (authenticated)
 * Used for wallet recharge and subscriptions
 */
router.post(
  '/create-checkout-session',
  authenticate,
  stripeController.createCheckoutSession
);

/**
 * Mock payment success (dev only)
 * Simulates successful payment and triggers webhook
 */
router.post(
  '/mock-payment-success',
  stripeController.mockPaymentSuccess
);

/**
 * Approve mock account (dev only)
 * Manually approve a mock Stripe Connect account for testing
 */
router.post(
  '/approve-mock-account',
  authenticateConsultant,
  stripeController.approveMockAccount
);

/**
 * Webhook endpoint (no auth - verified by signature)
 * Receives events from Stripe
 */
router.post(
  '/webhook',
  stripeController.handleWebhook
);

/**
 * Get Stripe connection status
 */
router.get(
  '/status',
  authenticate,
  stripeController.getStatus
);

export default router;
