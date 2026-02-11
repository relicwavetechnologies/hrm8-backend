import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { PriceBookSelectionService } from './price-book-selection.service';

/**
 * Salary Band Service
 * Determines executive search pricing band based on salary range
 */
export class SalaryBandService {
  /**
   * Get appropriate executive search band for a salary amount
   * Returns the band, price, and currency
   */
  static async getExecutiveSearchBand(
    companyId: string,
    salaryAmount: number
  ): Promise<{
    band: string;
    bandName: string;
    price: number;
    currency: string;
    salaryMin: number | null;
    salaryMax: number | null;
    productCode: string;
  }> {
    // Get effective price book
    const priceBook = await PriceBookSelectionService.getEffectivePriceBook(companyId);
    
    // Find all executive search tiers for this price book
    const execTiers = await prisma.priceTier.findMany({
      where: {
        price_book_id: priceBook.id,
        product: {
          code: { startsWith: 'RECRUIT_EXEC_BAND_' },
          is_active: true
        }
      },
      include: { product: true },
      orderBy: { salary_band_min: 'asc' }
    });
    
    if (execTiers.length === 0) {
      throw new HttpException(404, 'No executive search bands configured');
    }
    
    // Find matching band
    for (const tier of execTiers) {
      const minSalary = tier.salary_band_min ? Number(tier.salary_band_min) : 0;
      const maxSalary = tier.salary_band_max ? Number(tier.salary_band_max) : null;
      
      // Check if salary falls within this band
      if (salaryAmount >= minSalary) {
        if (maxSalary === null || salaryAmount <= maxSalary) {
          return {
            band: tier.band_name || tier.product.code,
            bandName: tier.band_name || tier.name,
            price: tier.unit_price,
            currency: priceBook.billing_currency || priceBook.currency,
            salaryMin: minSalary,
            salaryMax: maxSalary,
            productCode: tier.product.code
          };
        }
      }
    }
    
    // If no exact match, return highest band
    const highestBand = execTiers[execTiers.length - 1];
    return {
      band: highestBand.band_name || highestBand.product.code,
      bandName: highestBand.band_name || highestBand.name,
      price: highestBand.unit_price,
      currency: priceBook.billing_currency || priceBook.currency,
      salaryMin: highestBand.salary_band_min ? Number(highestBand.salary_band_min) : 0,
      salaryMax: highestBand.salary_band_max ? Number(highestBand.salary_band_max) : null,
      productCode: highestBand.product.code
    };
  }
  
  /**
   * Get all available executive search bands for display
   */
  static async getAllExecutiveSearchBands(companyId: string): Promise<Array<{
    band: string;
    bandName: string;
    price: number;
    currency: string;
    salaryMin: number | null;
    salaryMax: number | null;
    productCode: string;
  }>> {
    const priceBook = await PriceBookSelectionService.getEffectivePriceBook(companyId);
    
    const execTiers = await prisma.priceTier.findMany({
      where: {
        price_book_id: priceBook.id,
        product: {
          code: { startsWith: 'RECRUIT_EXEC_BAND_' },
          is_active: true
        }
      },
      include: { product: true },
      orderBy: { salary_band_min: 'asc' }
    });
    
    return execTiers.map(tier => ({
      band: tier.band_name || tier.product.code,
      bandName: tier.band_name || tier.name,
      price: tier.unit_price,
      currency: priceBook.billing_currency || priceBook.currency,
      salaryMin: tier.salary_band_min ? Number(tier.salary_band_min) : null,
      salaryMax: tier.salary_band_max ? Number(tier.salary_band_max) : null,
      productCode: tier.product.code
    }));
  }
  
  /**
   * Determine if a job qualifies for executive search pricing
   * Returns appropriate band based on salary max
   */
  static async determineJobBand(
    companyId: string,
    salaryMax: number
  ): Promise<{
    isExecutiveSearch: boolean;
    band?: string;
    price?: number;
    currency?: string;
    productCode?: string;
  }> {
    // Get company currency info
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { pricing_peg: true, billing_currency: true }
    });
    
    if (!company) {
      throw new HttpException(404, 'Company not found');
    }
    
    // Determine minimum executive search threshold by pricing peg
    const execThresholds: Record<string, number> = {
      'USD': 100000,
      'AUD': 150000,
      'GBP': 90000,
      'EUR': 90000,
      'INR': 2500000
    };
    
    const threshold = execThresholds[company.pricing_peg || 'USD'] || 100000;
    
    if (salaryMax < threshold) {
      return { isExecutiveSearch: false };
    }
    
    // This is executive search - get appropriate band
    const bandInfo = await this.getExecutiveSearchBand(companyId, salaryMax);
    
    return {
      isExecutiveSearch: true,
      band: bandInfo.band,
      price: bandInfo.price,
      currency: bandInfo.currency,
      productCode: bandInfo.productCode
    };
  }
}
