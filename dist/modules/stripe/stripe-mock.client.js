"use strict";
/**
 * Mock Stripe Client
 * Simulates Stripe operations for development/testing
 * Provides exact same interface as real Stripe client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockStripeClient = void 0;
exports.completeMockPayment = completeMockPayment;
exports.getMockSession = getMockSession;
exports.getAllMockSessions = getAllMockSessions;
exports.approveMockAccount = approveMockAccount;
exports.getAllMockAccounts = getAllMockAccounts;
const logger_1 = require("../../utils/logger");
// In-memory storage for mock data
const mockAccounts = new Map();
const mockSessions = new Map();
const logger = logger_1.Logger.create('stripe:mock');
/**
 * Simulate webhook event by calling backend webhook endpoint
 */
async function simulateWebhook(event, delayMs = 1500) {
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
    }
    catch (error) {
        logger.error('Webhook delivery error', error);
    }
}
/**
 * Mock Stripe Client Implementation
 */
class MockStripeClient {
    constructor() {
        this.accounts = {
            /**
             * Create a mock Stripe Connect account
             */
            create: async (params) => {
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2, 8);
                const accountId = `acct_mock_${timestamp}_${random}`;
                const account = {
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
            retrieve: async (accountId) => {
                let account = mockAccounts.get(accountId);
                // If not in memory (e.g. server restarted), create a mock one to match the ID
                if (!account) {
                    logger.info('Mock account not found in memory, recreating from ID', { accountId });
                    account = {
                        id: accountId,
                        object: 'account',
                        type: 'express',
                        country: 'US',
                        email: 'recovered@mock.com',
                        details_submitted: true, // Assume submitted if we are looking it up (it was saved in DB)
                        payouts_enabled: true, // Assume enabled
                        charges_enabled: true,
                        capabilities: { transfers: 'active' },
                        created: Math.floor(Date.now() / 1000),
                    };
                    mockAccounts.set(accountId, account);
                }
                return account;
            },
        };
        this.accountLinks = {
            /**
             * Create a mock account onboarding link
             */
            create: async (params) => {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
                const mockOnboardingUrl = `${frontendUrl}/dev/stripe-mock-onboarding?` +
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
        this.checkout = {
            sessions: {
                /**
                 * Create a mock checkout session
                 */
                create: async (params) => {
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
                    const session = {
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
                retrieve: async (sessionId) => {
                    const session = mockSessions.get(sessionId);
                    if (!session) {
                        throw new Error(`Session not found: ${sessionId}`);
                    }
                    return session;
                },
            },
        };
    }
}
exports.MockStripeClient = MockStripeClient;
/**
 * Manually complete a mock payment and trigger webhook
 * Called by /api/integrations/stripe/mock-payment-success endpoint
 */
async function completeMockPayment(sessionId) {
    const session = mockSessions.get(sessionId);
    if (!session) {
        logger.warn('Mock session not found for payment, ignoring', { sessionId });
        // Don't throw, just ignore to prevent crashes if session lost
        return;
    }
    // Update session to completed
    session.payment_status = 'paid';
    session.status = 'complete';
    mockSessions.set(sessionId, session);
    // Trigger webhook with realistic delay
    await simulateWebhook({
        type: 'checkout.session.completed',
        data: { object: session },
    }, 1500 // 1.5 second delay to simulate real Stripe
    );
}
/**
 * Get a mock session (for debugging/testing)
 */
function getMockSession(sessionId) {
    return mockSessions.get(sessionId);
}
/**
 * Get all mock sessions (for debugging)
 */
function getAllMockSessions() {
    return mockSessions;
}
/**
 * Manually approve a mock account (for testing)
 */
function approveMockAccount(accountId) {
    let account = mockAccounts.get(accountId);
    if (!account) {
        // Create if missing so approval works
        account = {
            id: accountId,
            object: 'account',
            type: 'express',
            country: 'US',
            email: 'recovered@mock.com',
            details_submitted: false,
            payouts_enabled: false,
            charges_enabled: false,
            created: Math.floor(Date.now() / 1000),
        };
        mockAccounts.set(accountId, account);
    }
    account.details_submitted = true;
    account.payouts_enabled = true;
    account.charges_enabled = true;
    mockAccounts.set(accountId, account);
}
/**
 * Get all mock accounts (for debugging)
 */
function getAllMockAccounts() {
    return mockAccounts;
}
