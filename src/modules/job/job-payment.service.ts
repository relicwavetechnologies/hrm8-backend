import {
  TransactionDirection,
  TransactionStatus,
  VirtualAccountOwner,
  VirtualAccountStatus,
  VirtualTransactionType
} from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { BaseService } from '../../core/service';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';
import { PriceBookSelectionService } from '../pricing/price-book-selection.service';
import { SalaryBandService } from '../pricing/salary-band.service';

export type ServicePackage = 'self-managed' | 'shortlisting' | 'full-service' | 'executive-search' | 'rpo';

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
    serviceType: 'shortlisting' | 'full-service' | 'executive-search' | 'rpo'
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
      'executive-search': 'EXEC_BAND_1', // Lowest band if not qualified
      rpo: 'RPO',
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
    servicePackage: ServicePackage | string,
    userId: string
  ): Promise<{ success: boolean; error?: string; pricing?: any; wasAlreadyCharged?: boolean }> {
    // Self-managed is free
    if (servicePackage === 'self-managed') {
      return { success: true };
    }

    try {
      // Get dynamic pricing
      const pricing = await JobPaymentService.getJobPrice(
        companyId,
        salaryMax,
        servicePackage as 'shortlisting' | 'full-service' | 'executive-search' | 'rpo'
      );

      // Get currency info
      const { pricingPeg } =
        await CurrencyAssignmentService.getCompanyCurrencies(companyId);

      // Validate currency lock
      await CurrencyAssignmentService.validateCurrencyLock(
        companyId,
        pricing.currency
      );

      const chargeDescription = `Job posting payment (${servicePackage}${pricing.band ? ` - ${pricing.band}` : ''})`;

      const txResult = await prisma.$transaction(async (tx) => {
        // 1. Get or create company wallet account inside the same DB transaction.
        let account = await tx.virtualAccount.findUnique({
          where: {
            owner_type_owner_id: {
              owner_type: VirtualAccountOwner.COMPANY,
              owner_id: companyId,
            },
          },
        });

        if (!account) {
          account = await tx.virtualAccount.create({
            data: {
              owner_type: VirtualAccountOwner.COMPANY,
              owner_id: companyId,
              balance: 0,
              status: VirtualAccountStatus.ACTIVE,
            },
          });
        }

        if (account.status !== VirtualAccountStatus.ACTIVE) {
          throw new Error('Wallet account is not active');
        }

        // 2. Idempotency guard: if this exact job/service charge already exists,
        // do not debit again. This protects retries after partial failures.
        const existingCharge = await tx.virtualTransaction.findFirst({
          where: {
            virtual_account_id: account.id,
            type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
            reference_type: 'JOB',
            reference_id: jobId,
            status: TransactionStatus.COMPLETED,
            description: { contains: `Job posting payment (${servicePackage}` },
          },
          orderBy: { created_at: 'desc' },
        });

        if (!existingCharge) {
          // 3. Debit wallet.
          if (account.balance < pricing.price) {
            throw new Error(
              `Insufficient wallet balance. ` +
              `Required: ${pricing.currency} ${pricing.price.toFixed(2)}, ` +
              `Available: ${pricing.currency} ${account.balance.toFixed(2)}`
            );
          }

          const newBalance = account.balance - pricing.price;

          await tx.virtualTransaction.create({
            data: {
              virtual_account_id: account.id,
              type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
              amount: pricing.price,
              balance_after: newBalance,
              direction: TransactionDirection.DEBIT,
              status: TransactionStatus.COMPLETED,
              description: chargeDescription,
              reference_type: 'JOB',
              reference_id: jobId,
              created_by: userId,
              pricing_peg_used: pricingPeg,
              billing_currency_used: pricing.currency,
              price_book_id: pricing.priceBookId,
              price_book_version: pricing.priceBookVersion,
            },
          });

          await tx.virtualAccount.update({
            where: { id: account.id },
            data: {
              balance: newBalance,
              total_debits: { increment: pricing.price },
            },
          });

        }

        // 4. Mark job paid and snapshot pricing.
        await tx.job.update({
          where: { id: jobId },
          data: {
            payment_status: 'PAID',
            payment_amount: pricing.price,
            payment_currency: pricing.currency,
            payment_completed_at: new Date(),
            payment_failed_at: null,
            price_book_id: pricing.priceBookId,
            pricing_peg: pricingPeg,
            price_book_version: pricing.priceBookVersion,
          },
        });

        return { wasAlreadyCharged: Boolean(existingCharge) };
      }, {
        maxWait: 10_000,
        timeout: 20_000,
      });

      // Lock company currency after first successful payment commit.
      try {
        await CurrencyAssignmentService.lockCurrency(companyId);
      } catch {
        // Already locked or lock failed; payment still succeeded.
      }

      console.log(
        `✅ Job payment processed: ${pricing.currency} ${pricing.price}` +
        `${pricing.band ? ` (${pricing.band})` : ''}` +
        `${txResult.wasAlreadyCharged ? ' [idempotent-reuse]' : ''}`
      );

      return { success: true, pricing, wasAlreadyCharged: txResult.wasAlreadyCharged };
    } catch (error: any) {
      console.error('Job payment failed:', error);
      return { success: false, error: error.message || 'Payment failed' };
    }
  }

  /**
   * Compensating action:
   * If consultant assignment fails after successful managed-service debit,
   * reverse the debit immediately and restore job payment state to pending.
   */
  async refundManagedServicePaymentOnAssignmentFailure(
    companyId: string,
    jobId: string,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; refunded: boolean; error?: string }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const account = await tx.virtualAccount.findUnique({
          where: {
            owner_type_owner_id: {
              owner_type: VirtualAccountOwner.COMPANY,
              owner_id: companyId,
            },
          },
        });

        if (!account) {
          throw new Error('Company wallet account not found for managed-service refund');
        }

        const latestCharge = await tx.virtualTransaction.findFirst({
          where: {
            virtual_account_id: account.id,
            type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
            reference_type: 'JOB',
            reference_id: jobId,
            status: {
              in: [TransactionStatus.COMPLETED, TransactionStatus.REVERSED],
            },
          },
          orderBy: { created_at: 'desc' },
        });

        if (!latestCharge) {
          await tx.job.update({
            where: { id: jobId },
            data: {
              payment_status: 'PENDING',
              payment_completed_at: null,
              payment_failed_at: new Date(),
            },
          });
          return { refunded: false };
        }

        const existingRefund = await tx.virtualTransaction.findFirst({
          where: {
            virtual_account_id: account.id,
            type: VirtualTransactionType.JOB_REFUND,
            reference_type: 'JOB',
            reference_id: jobId,
            status: TransactionStatus.COMPLETED,
            description: { contains: latestCharge.id },
          },
          orderBy: { created_at: 'desc' },
        });

        let refunded = false;
        if (!existingRefund) {
          const newBalance = account.balance + latestCharge.amount;

          await tx.virtualTransaction.create({
            data: {
              virtual_account_id: account.id,
              type: VirtualTransactionType.JOB_REFUND,
              amount: latestCharge.amount,
              balance_after: newBalance,
              direction: TransactionDirection.CREDIT,
              status: TransactionStatus.COMPLETED,
              description: `Auto-refund after assignment failure (job ${jobId}, charge ${latestCharge.id})`,
              metadata: {
                source: 'MANAGED_ASSIGNMENT_FAILURE',
                reversal_of_transaction_id: latestCharge.id,
                reason,
              } as any,
              reference_type: 'JOB',
              reference_id: jobId,
              created_by: userId,
              pricing_peg_used: latestCharge.pricing_peg_used,
              billing_currency_used: latestCharge.billing_currency_used,
              price_book_id: latestCharge.price_book_id,
              price_book_version: latestCharge.price_book_version,
            },
          });

          await tx.virtualAccount.update({
            where: { id: account.id },
            data: {
              balance: newBalance,
              total_credits: { increment: latestCharge.amount },
            },
          });

          refunded = true;
        }

        if (latestCharge.status === TransactionStatus.COMPLETED) {
          await tx.virtualTransaction.update({
            where: { id: latestCharge.id },
            data: {
              status: TransactionStatus.REVERSED,
              failed_reason: reason,
            },
          });
        }

        await tx.job.update({
          where: { id: jobId },
          data: {
            payment_status: 'PENDING',
            payment_completed_at: null,
            payment_failed_at: new Date(),
            payment_amount: latestCharge.amount,
            payment_currency: latestCharge.billing_currency_used || undefined,
          },
        });

        return { refunded };
      }, {
        maxWait: 10_000,
        timeout: 20_000,
      });

      return { success: true, refunded: result.refunded };
    } catch (error: any) {
      console.error('Managed-service refund compensation failed:', error);
      return {
        success: false,
        refunded: false,
        error: error.message || 'Failed to reverse managed-service payment',
      };
    }
  }
}

export const jobPaymentService = new JobPaymentService();
