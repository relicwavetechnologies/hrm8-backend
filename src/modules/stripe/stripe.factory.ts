/**
 * Stripe Factory
 * Provides the correct Stripe client based on environment
 * Supports both real Stripe and mock Stripe for development
 */

import Stripe from 'stripe';
import { MockStripeClient } from './stripe-mock.client';
import { IStripeClient } from './stripe.types';

export class StripeFactory {
  private static mockClient: MockStripeClient | null = null;
  private static realClient: Stripe | null = null;

  /**
   * Get the appropriate Stripe client based on environment
   * Returns IStripeClient interface (works with both real and mock)
   */
  static getClient(): IStripeClient {
    const useMock = this.shouldUseMock();

    if (useMock) {
      return this.getMockClient();
    } else {
      return this.getRealClient() as any; // Real Stripe client implements same interface
    }
  }

  /**
   * Get raw Stripe client (for operations not in IStripeClient interface)
   * Use sparingly - prefer getClient() for consistency
   */
  static getRawClient(): Stripe | MockStripeClient {
    const useMock = this.shouldUseMock();
    return useMock ? this.getMockClient() : this.getRealClient();
  }

  /**
   * Determine if mock should be used
   */
  private static shouldUseMock(): boolean {
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
  private static getMockClient(): MockStripeClient {
    if (!this.mockClient) {
      this.mockClient = new MockStripeClient();
    }
    return this.mockClient;
  }

  /**
   * Get or create real Stripe client (singleton)
   */
  private static getRealClient(): Stripe {
    if (!this.realClient) {
      const apiKey = process.env.STRIPE_SECRET_KEY;

      if (!apiKey) {
        throw new Error(
          '[StripeFactory] STRIPE_SECRET_KEY is required for real Stripe client. ' +
          'Set USE_MOCK_STRIPE=true to use mock client instead.'
        );
      }

      this.realClient = new Stripe(apiKey, {
        apiVersion: '2025-02-24.acacia', // Latest stable version
      });
    }

    return this.realClient;
  }

  /**
   * Check if currently using mock
   */
  static isUsingMock(): boolean {
    return this.shouldUseMock();
  }

  /**
   * Get client type name (for logging/debugging)
   */
  static getClientType(): 'mock' | 'real' {
    return this.shouldUseMock() ? 'mock' : 'real';
  }
}
