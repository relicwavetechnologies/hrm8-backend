"use strict";
/**
 * Stripe Factory
 * Provides the correct Stripe client based on environment
 * Supports both real Stripe and mock Stripe for development
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeFactory = void 0;
const stripe_1 = __importDefault(require("stripe"));
const stripe_mock_client_1 = require("./stripe-mock.client");
class StripeFactory {
    /**
     * Get the appropriate Stripe client based on environment
     * Returns IStripeClient interface (works with both real and mock)
     */
    static getClient() {
        const useMock = this.shouldUseMock();
        if (useMock) {
            return this.getMockClient();
        }
        else {
            return this.getRealClient(); // Real Stripe client implements same interface
        }
    }
    /**
     * Get raw Stripe client (for operations not in IStripeClient interface)
     * Use sparingly - prefer getClient() for consistency
     */
    static getRawClient() {
        const useMock = this.shouldUseMock();
        return useMock ? this.getMockClient() : this.getRealClient();
    }
    /**
     * Determine if mock should be used
     */
    static shouldUseMock() {
        // Explicit override via env variable
        if (process.env.USE_MOCK_STRIPE === 'true') {
            return true;
        }
        if (process.env.USE_MOCK_STRIPE === 'false') {
            return false;
        }
        // Default: use mock in development, real in production
        const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
        return isDevelopment;
    }
    /**
     * Get or create mock client (singleton)
     */
    static getMockClient() {
        if (!this.mockClient) {
            this.mockClient = new stripe_mock_client_1.MockStripeClient();
        }
        return this.mockClient;
    }
    /**
     * Get or create real Stripe client (singleton)
     */
    static getRealClient() {
        if (!this.realClient) {
            const apiKey = process.env.STRIPE_SECRET_KEY;
            if (!apiKey) {
                throw new Error('[StripeFactory] STRIPE_SECRET_KEY is required for real Stripe client. ' +
                    'Set USE_MOCK_STRIPE=true to use mock client instead.');
            }
            this.realClient = new stripe_1.default(apiKey, {
                apiVersion: '2025-02-24.acacia', // Latest stable version
            });
        }
        return this.realClient;
    }
    /**
     * Check if currently using mock
     */
    static isUsingMock() {
        return this.shouldUseMock();
    }
    /**
     * Get client type name (for logging/debugging)
     */
    static getClientType() {
        return this.shouldUseMock() ? 'mock' : 'real';
    }
}
exports.StripeFactory = StripeFactory;
StripeFactory.mockClient = null;
StripeFactory.realClient = null;
