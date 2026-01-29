export type ServicePackage = 'self-managed' | 'shortlisting' | 'full-service' | 'executive-search';

export interface ServicePackagePricing {
  name: ServicePackage;
  price: number;
  currency: string;
  label: string;
  description: string;
  isFreemium: boolean;
}

export const PRICING_PACKAGES: Record<ServicePackage, ServicePackagePricing> = {
  'self-managed': {
    name: 'self-managed',
    price: 0,
    currency: 'USD',
    label: 'Self-Managed',
    description: 'Post jobs and manage recruitment yourself',
    isFreemium: true,
  },
  'shortlisting': {
    name: 'shortlisting',
    price: 1990,
    currency: 'USD',
    label: 'Shortlisting',
    description: 'We help screen and shortlist candidates',
    isFreemium: false,
  },
  'full-service': {
    name: 'full-service',
    price: 5990,
    currency: 'USD',
    label: 'Full Service',
    description: 'Complete recruitment management',
    isFreemium: false,
  },
  'executive-search': {
    name: 'executive-search',
    price: 9990,
    currency: 'USD',
    label: 'Executive Search',
    description: 'Executive-level recruitment services',
    isFreemium: false,
  },
};

export class PricingService {
  /**
   * Get pricing for a service package
   */
  static getPricingByPackage(packageName: ServicePackage): ServicePackagePricing {
    const pricing = PRICING_PACKAGES[packageName];
    if (!pricing) {
      throw new Error(`Invalid service package: ${packageName}`);
    }
    return pricing;
  }

  /**
   * Get price amount in cents (for payment processing)
   */
  static getPriceInCents(packageName: ServicePackage): number {
    const pricing = this.getPricingByPackage(packageName);
    return pricing.price * 100; // Convert to cents
  }

  /**
   * Get price amount in dollars
   */
  static getPriceInDollars(packageName: ServicePackage): number {
    return this.getPricingByPackage(packageName).price;
  }

  /**
   * Check if package is free
   */
  static isFreePackage(packageName: ServicePackage): boolean {
    return this.getPricingByPackage(packageName).isFreemium;
  }

  /**
   * Get all packages
   */
  static getAllPackages(): ServicePackagePricing[] {
    return Object.values(PRICING_PACKAGES);
  }

  /**
   * Get all paid packages
   */
  static getPaidPackages(): ServicePackagePricing[] {
    return Object.values(PRICING_PACKAGES).filter(p => !p.isFreemium);
  }
}
