"use strict";
/**
 * Stripe Service
 * Business logic for Stripe operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const stripe_factory_1 = require("./stripe.factory");
const wallet_service_1 = require("../wallet/wallet.service");
const subscription_service_1 = require("../subscription/subscription.service");
const logger_1 = require("../../utils/logger");
class StripeService {
    /**
     * Create a checkout session for wallet recharge with multi-currency support
     */
    static async createCheckoutSession(params) {
        const stripe = stripe_factory_1.StripeFactory.getClient();
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const { amount, description, currency = 'usd', // ✅ Multi-currency support
        metadata = {}, customerEmail, successUrl, cancelUrl, } = params;
        // Validate amount (must be positive integer in cents)
        if (amount <= 0 || !Number.isInteger(amount)) {
            throw new Error('Amount must be a positive integer in cents');
        }
        // Convert to cents if needed (Stripe expects cents)
        const amountInCents = amount;
        // Currency symbol mapping
        const currencySymbols = {
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
                            currency: currency.toLowerCase(), // ✅ Dynamic currency
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
                    currency: currency.toUpperCase(), // ✅ Store for webhook
                },
                customer_email: customerEmail,
            });
            return {
                sessionId: session.id,
                url: session.url,
            };
        }
        catch (error) {
            this.logger.error('Failed to create checkout session', error);
            throw new Error(`Failed to create checkout session: ${error.message}`);
        }
    }
    /**
     * Process completed checkout session webhook
     * Credits wallet with payment amount
     */
    static async processCheckoutCompleted(session) {
        // Validate payment was successful
        if (session.payment_status !== 'paid') {
            return;
        }
        // Extract metadata
        const metadata = session.metadata || {};
        const paymentType = metadata.type || 'unknown';
        const companyId = metadata.companyId;
        const userId = metadata.userId;
        if (!companyId) {
            throw new Error('Missing companyId in session metadata');
        }
        // Credit wallet based on payment type
        if (paymentType === 'wallet_recharge') {
            const timer = this.logger.startTimer();
            await this.creditWalletFromPayment(session, companyId, userId);
            timer.end('Wallet credited', {
                companyId,
                amount: session.amount_total / 100,
            });
        }
        else if (paymentType === 'subscription') {
            const timer = this.logger.startTimer();
            await this.activateSubscriptionFromPayment(session, companyId, userId, metadata);
            timer.end('Subscription activated', {
                companyId,
                amount: session.amount_total / 100,
                planType: metadata.planType,
            });
        }
        else {
            this.logger.warn('Unknown payment type', { paymentType, sessionId: session.id });
        }
    }
    /**
     * Activate subscription from successful payment
     */
    static async activateSubscriptionFromPayment(session, companyId, userId, metadata) {
        const amountInDollars = session.amount_total / 100;
        const { planType, name, billingCycle, jobQuota } = metadata;
        if (!planType || !name || !billingCycle) {
            throw new Error('Missing subscription details in metadata');
        }
        await subscription_service_1.SubscriptionService.createSubscription({
            companyId,
            planType: planType,
            name,
            basePrice: amountInDollars,
            billingCycle: billingCycle,
            jobQuota: jobQuota ? parseInt(jobQuota, 10) : undefined,
            salesAgentId: userId, // Assuming user buying is the agent or self-serve
            autoRenew: true,
        });
    }
    /**
     * Credit wallet account from successful payment
     */
    static async creditWalletFromPayment(session, companyId, userId) {
        const amountInDollars = session.amount_total / 100;
        // Get or create wallet account
        const account = await wallet_service_1.WalletService.getOrCreateAccount('COMPANY', companyId);
        // Credit the wallet (atomic transaction)
        await wallet_service_1.WalletService.creditAccount({
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
    static async retrieveSession(sessionId) {
        const stripe = stripe_factory_1.StripeFactory.getClient();
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return session;
        }
        catch (error) {
            this.logger.error('Failed to retrieve session', { sessionId, error: error.message });
            throw new Error(`Session not found: ${sessionId}`);
        }
    }
    /**
     * Validate webhook signature (for real Stripe only)
     * Mock Stripe uses X-Mock-Stripe-Event header instead
     */
    static validateWebhookSignature(payload, signature, webhookSecret) {
        if (stripe_factory_1.StripeFactory.isUsingMock()) {
            // Mock Stripe doesn't have signatures
            return JSON.parse(payload.toString());
        }
        // Use real Stripe to validate
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        try {
            const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            return event;
        }
        catch (error) {
            throw new Error(`Webhook signature verification failed: ${error.message}`);
        }
    }
}
exports.StripeService = StripeService;
StripeService.logger = logger_1.Logger.create('stripe:service');
