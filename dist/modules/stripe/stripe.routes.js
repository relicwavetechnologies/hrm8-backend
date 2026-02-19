"use strict";
/**
 * Stripe Routes
 * API endpoints for Stripe integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_controller_1 = require("./stripe.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const consultant_auth_middleware_1 = require("../../middlewares/consultant-auth.middleware");
const router = (0, express_1.Router)();
const stripeController = new stripe_controller_1.StripeController();
/**
 * Create checkout session (authenticated)
 * Used for wallet recharge and subscriptions
 */
router.post('/create-checkout-session', auth_middleware_1.authenticate, stripeController.createCheckoutSession);
/**
 * Mock payment success (dev only)
 * Simulates successful payment and triggers webhook
 */
router.post('/mock-payment-success', stripeController.mockPaymentSuccess);
/**
 * Approve mock account (dev only)
 * Manually approve a mock Stripe Connect account for testing
 */
router.post('/approve-mock-account', consultant_auth_middleware_1.authenticateConsultant, stripeController.approveMockAccount);
/**
 * Webhook endpoint (no auth - verified by signature)
 * Receives events from Stripe
 */
router.post('/webhook', stripeController.handleWebhook);
/**
 * Get Stripe connection status
 */
router.get('/status', auth_middleware_1.authenticate, stripeController.getStatus);
exports.default = router;
