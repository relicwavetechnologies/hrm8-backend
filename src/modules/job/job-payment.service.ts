import { PaymentStatus, VirtualTransactionType } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { BaseService } from '../../core/service';
import { WalletService } from '../wallet/wallet.service';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';
import { PriceBookSelectionService } from '../pricing/price-book-selection.service';
import { SalaryBandService } from '../pricing/salary-band.service';

export type ServicePackage = 'self-managed' | 'shortlisting' | 'full-service' | 'executive-search';

// Legacy hardcoded prices - kept for backward compatibility but not used
// Use getJobPrice() for dynamic pricing
export const UPGRADE_PRICE_MAP = {
    shortlisting: { amount: 1990, currency: 'usd', label: 'Shortlisting' },
    full_service: { amount: 5990, currency: 'usd', label: 'Full Service' },
    executive_search: { amount: 9990, currency: 'usd', label: 'Executive Search' },
} as const;

export class JobPaymentService extends BaseService {
    /**
     * Get dynamic price for job posting based on salary and service type
     * Uses regional pricing and salary band detection
     */
    static async getJobPrice(
      companyId: string,
      salaryMax: number,
      serviceType: 'shortlisting' | 'full-service' | 'executive-search'
    ): Promise<{ 
      price: number; 
      currency: string; 
      productCode: string; 
      band?: string;
      priceBookId: string;
      priceBookVersion: string;
    }> {
      // Check if executive search based on salary
      const bandInfo = await SalaryBandService.determineJobBand(companyId, salaryMax);
      
      if (bandInfo.isExecutiveSearch && serviceType === 'executive-search') {
        // Use salary-band based pricing
        const priceBook = await PriceBookSelectionService.getEffectivePriceBook(companyId);
        return {
          price: bandInfo.price!,
          currency: bandInfo.currency!,
          productCode: bandInfo.productCode!,
          band: bandInfo.band,
          priceBookId: priceBook.id,
          priceBookVersion: priceBook.version || '2026-Q1',
        };
      }
      
      // Use standard recruitment pricing
      const serviceTypeMap: Record<string, any> = {
        'shortlisting': 'SHORTLISTING',
        'full-service': 'FULL',
        'executive-search': 'EXEC_BAND_1' // Lowest band if not qualified
      };
      
      const result = await PriceBookSelectionService.getRecruitmentPrice(
        companyId,
        serviceTypeMap[serviceType]
      );
      
      return {
        price: result.price,
        currency: result.currency,
        productCode: result.tier.product.code,
        priceBookId: result.priceBook.id,
        priceBookVersion: result.priceBook.version || '2026-Q1',
      };
    }

    /**
     * Get payment amount for a service package (legacy)
     * @deprecated Use getJobPrice() for dynamic pricing
     */
    static getPaymentAmount(servicePackage: ServicePackage | string): { amount: number; currency: string } | null {
        if (servicePackage === 'self-managed') {
            return null;
        }

        const packageKeyMap: Record<string, string> = {
            'shortlisting': 'shortlisting',
            'full-service': 'full_service',
            'executive-search': 'executive_search',
        };
        const packageKey = packageKeyMap[servicePackage] || servicePackage;
        const priceInfo = (UPGRADE_PRICE_MAP as any)[packageKey.replace('-', '_')];

        if (!priceInfo) {
            return null;
        }

        return {
            amount: priceInfo.amount,
            currency: priceInfo.currency,
        };
    }

    /**
     * Check if a service package requires payment
     */
    static requiresPayment(servicePackage: ServicePackage | string): boolean {
        return servicePackage !== 'self-managed';
    }

    /**
     * Process payment for a job from wallet with dynamic regional pricing
     */
    async payForJobFromWallet(
      companyId: string,
      jobId: string,
      salaryMax: number,
      servicePackage: 'shortlisting' | 'full-service' | 'executive-search',
      userId: string
    ): Promise<{ success: boolean; error?: string; pricing?: any }> {
        // Self-managed is free
        if (servicePackage === 'self-managed') {
            return { success: true };
        }

        try {
            // Get dynamic pricing
            const pricing = await JobPaymentService.getJobPrice(
              companyId,
              salaryMax,
              servicePackage
            );
            
            // Get currency info
            const { pricingPeg, billingCurrency } = 
              await CurrencyAssignmentService.getCompanyCurrencies(companyId);
            
            // Validate currency lock
            await CurrencyAssignmentService.validateCurrencyLock(
              companyId,
              pricing.currency
            );
            
            return await prisma.$transaction(async (tx) => {
                // 1. Get account
                const account = await WalletService.getOrCreateAccount('COMPANY', companyId);

                // 2. Check balance
                if (account.balance < pricing.price) {
                    throw new Error(
                      `Insufficient wallet balance. ` +
                      `Required: ${pricing.currency} ${pricing.price.toFixed(2)}, ` +
                      `Available: ${pricing.currency} ${account.balance.toFixed(2)}`
                    );
                }

                // 3. Debit account with pricing metadata
                await WalletService.debitAccount({
                  accountId: account.id,
                  amount: pricing.price,
                  type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
                  description: `Job posting payment (${servicePackage}${pricing.band ? ` - ${pricing.band}` : ''})`,
                  referenceType: 'JOB',
                  referenceId: jobId,
                  createdBy: userId,
                  pricingPeg,
                  billingCurrency: pricing.currency,
                  priceBookId: pricing.priceBookId,
                  priceBookVersion: pricing.priceBookVersion,
                });
                
                // Lock currency on first transaction
                try {
                  await CurrencyAssignmentService.lockCurrency(companyId);
                } catch (error) {
                  // Already locked - continue
                }

                // 4. Update job payment status
                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        payment_status: 'PAID',
                        payment_amount: pricing.price,
                        payment_currency: pricing.currency,
                        payment_completed_at: new Date(),
                    }
                });

                console.log(`✅ Job payment processed: ${pricing.currency} ${pricing.price}${pricing.band ? ` (${pricing.band})` : ''}`);

                return { success: true, pricing };
            });
        } catch (error: any) {
            console.error('Job payment failed:', error);
            return { success: false, error: error.message || 'Payment failed' };
        }
    }
}

export const jobPaymentService = new JobPaymentService();
