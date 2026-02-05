/**
 * Stripe Factory
 * Provides the correct Stripe client based on environment
 */

import Stripe from 'stripe';
import { MockStripeClient } from './MockStripeClient';
import { env } from '../../../config/env';

export class StripeFactory {
    private static mockClient: MockStripeClient | null = null;
    private static realClient: Stripe | null = null;

    /**
     * Get the appropriate Stripe client based on environment (Async)
     */
    static async getClientAsync(): Promise<any> {
        const useMock = this.shouldUseMock();

        if (useMock) {
            return this.getMockClient();
        } else {
            return this.getRealClientAsync();
        }
    }

    /**
     * Determine if mock should be used
     */
    private static shouldUseMock(): boolean {
        // Explicit override via env variable
        if (env.USE_MOCK_STRIPE === 'true') {
            return true;
        }

        if (env.USE_MOCK_STRIPE === 'false') {
            return false;
        }

        // Default: use mock in development, real in production
        return env.NODE_ENV === 'development';
    }

    /**
     * Get or create mock client (singleton)
     */
    private static getMockClient(): MockStripeClient {
        if (!this.mockClient) {
            this.mockClient = new MockStripeClient();
        }
        return this.mockClient;
    }

    /**
     * Get or create real Stripe client (Async)
     */
    private static async getRealClientAsync(): Promise<Stripe> {
        if (!this.realClient) {
            const apiKey = env.STRIPE_SECRET_KEY;

            if (!apiKey) {
                throw new Error('[StripeFactory] STRIPE_SECRET_KEY is required for real Stripe client');
            }

            this.realClient = new Stripe(apiKey, {
                apiVersion: '2025-01-27.acacia', // Using a stable version
            } as any);
        }

        return this.realClient;
    }

    /**
     * Check if currently using mock
     */
    static isUsingMock(): boolean {
        return this.shouldUseMock();
    }
}
