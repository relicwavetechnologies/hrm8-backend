/**
 * Available Currencies Service
 * Returns currencies that have active, approved price books mapped in the system.
 * Used on first-login currency setup to show only currencies that can be used for billing.
 */

import { prisma } from '../../utils/prisma';

export class AvailableCurrenciesService {
  /**
   * Get distinct billing currencies that have at least one active, approved price book.
   * Sorted alphabetically for consistent UI display.
   */
  static async getAvailableCurrencies(): Promise<string[]> {
    const priceBooks = await prisma.priceBook.findMany({
      where: {
        is_active: true,
        is_approved: true,
        billing_currency: { not: null },
      },
      select: { billing_currency: true },
      distinct: ['billing_currency'],
    });

    const currencies = priceBooks
      .map((pb) => pb.billing_currency)
      .filter((c): c is string => c != null && c.trim() !== '')
      .sort((a, b) => a.localeCompare(b));

    return currencies;
  }
}
