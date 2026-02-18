"use strict";
/**
 * Stripe Controller
 * HTTP handlers for Stripe operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeController = void 0;
const controller_1 = require("../../core/controller");
const stripe_service_1 = require("./stripe.service");
const stripe_factory_1 = require("./stripe.factory");
const stripe_mock_client_1 = require("./stripe-mock.client");
class StripeController extends controller_1.BaseController {
    constructor() {
        super('stripe');
        /**
         * Create a checkout session for wallet recharge
         * POST /api/integrations/stripe/create-checkout-session
         */
        this.createCheckoutSession = async (req, res) => {
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
                const session = await stripe_service_1.StripeService.createCheckoutSession({
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
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Mock payment success endpoint
         * Only available when using mock Stripe
         * POST /api/integrations/stripe/mock-payment-success
         */
        this.mockPaymentSuccess = async (req, res) => {
            try {
                if (!stripe_factory_1.StripeFactory.isUsingMock()) {
                    return this.sendError(res, new Error('Mock endpoints only available in development mode'), 403);
                }
                const { sessionId } = req.body;
                if (!sessionId) {
                    return this.sendError(res, new Error('sessionId is required'), 400);
                }
                // Complete the mock payment and trigger webhook
                await (0, stripe_mock_client_1.completeMockPayment)(sessionId);
                return this.sendSuccess(res, {
                    message: 'Mock payment completed and webhook triggered',
                    sessionId,
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Stripe webhook handler
         * POST /api/integrations/stripe/webhook
         */
        this.handleWebhook = async (req, res) => {
            try {
                const isMockEvent = req.headers['x-mock-stripe-event'] === 'true';
                let event;
                if (isMockEvent) {
                    // Mock Stripe event - no signature verification
                    event = req.body;
                }
                else {
                    // Real Stripe event - verify signature
                    const signature = req.headers['stripe-signature'];
                    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
                    if (!webhookSecret) {
                        throw new Error('STRIPE_WEBHOOK_SECRET not configured');
                    }
                    if (!signature) {
                        throw new Error('Missing stripe-signature header');
                    }
                    // Verify signature and get event
                    event = stripe_service_1.StripeService.validateWebhookSignature(req.body, signature, webhookSecret);
                }
                // Handle different event types
                switch (event.type) {
                    case 'checkout.session.completed':
                        await stripe_service_1.StripeService.processCheckoutCompleted(event.data.object);
                        this.logger.info('Webhook processed', { eventType: event.type });
                        break;
                    case 'checkout.session.expired':
                        break;
                    default:
                }
                // Always return 200 to acknowledge receipt
                return res.status(200).json({ received: true });
            }
            catch (error) {
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
        this.approveMockAccount = async (req, res) => {
            try {
                if (!stripe_factory_1.StripeFactory.isUsingMock()) {
                    return this.sendError(res, new Error('Only available in mock mode'), 403);
                }
                const { accountId } = req.body;
                if (!accountId) {
                    return this.sendError(res, new Error('accountId required'), 400);
                }
                const { approveMockAccount } = await Promise.resolve().then(() => __importStar(require('./stripe-mock.client')));
                approveMockAccount(accountId);
                this.logger.info('Mock account approved', { accountId });
                return this.sendSuccess(res, {
                    message: 'Mock account approved',
                    accountId
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Get Stripe connection status
         * GET /api/integrations/stripe/status
         */
        this.getStatus = async (req, res) => {
            try {
                const isMock = stripe_factory_1.StripeFactory.isUsingMock();
                const clientType = stripe_factory_1.StripeFactory.getClientType();
                return this.sendSuccess(res, {
                    connected: true, // Always connected (mock or real)
                    mode: clientType,
                    isMock,
                    environment: process.env.NODE_ENV,
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.StripeController = StripeController;
