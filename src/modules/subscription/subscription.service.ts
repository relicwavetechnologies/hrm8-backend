import { prisma } from '../../utils/prisma';
import { WalletService } from '../wallet/wallet.service';
import { 
  SubscriptionPlanType, 
  SubscriptionStatus, 
  VirtualTransactionType 
} from '@prisma/client';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';
import { PriceBookSelectionService } from '../pricing/price-book-selection.service';

export interface CreateSubscriptionInput {
  companyId: string;
  planType: SubscriptionPlanType;
  name: string;
  basePrice?: number;  // Optional - will be fetched from price book if not provided
  billingCycle: 'MONTHLY' | 'ANNUAL';
  jobQuota?: number | null;
  discountPercent?: number;
  salesAgentId?: string;
  referredBy?: string;
  autoRenew?: boolean;
  startDate?: Date;
}

export class SubscriptionService {
  /**
   * Create a new subscription with dynamic regional pricing
   */
  static async createSubscription(input: CreateSubscriptionInput) {
    const {
      companyId,
      planType,
      name,
      basePrice: providedBasePrice,
      billingCycle,
      jobQuota,
      discountPercent = 0,
      salesAgentId,
      referredBy,
      autoRenew = true,
      startDate = new Date(),
    } = input;

    return await prisma.$transaction(async (tx) => {
      // 1. Get company currency information
      const { pricingPeg, billingCurrency } = 
        await CurrencyAssignmentService.getCompanyCurrencies(companyId);
      
      // 2. Get subscription price from price book (regional pricing)
      let basePrice = providedBasePrice;
      let priceBookId: string | undefined;
      let priceBookVersion: string | undefined;
      
      if (!basePrice) {
        // Fetch price from price book
        const pricing = await PriceBookSelectionService.getSubscriptionPrice(
          companyId,
          planType
        );
        basePrice = pricing.price;
        priceBookId = pricing.priceBook.id;
        priceBookVersion = pricing.priceBook.version;
      } else {
        // Get price book for audit even if price provided
        const priceBook = await PriceBookSelectionService.getEffectivePriceBook(companyId);
        priceBookId = priceBook.id;
        priceBookVersion = priceBook.version;
      }
      
      // Calculate end date
      const endDate = new Date(startDate);
      if (billingCycle === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      const renewalDate = new Date(endDate);

      // Create subscription with dynamic pricing
      const subscription = await tx.subscription.create({
        data: {
          company_id: companyId,
          name,
          plan_type: planType,
          status: SubscriptionStatus.ACTIVE,
          base_price: basePrice,
          currency: billingCurrency,  // ✅ Dynamic currency
          billing_cycle: billingCycle,
          discount_percent: discountPercent,
          start_date: startDate,
          end_date: endDate,
          renewal_date: renewalDate,
          job_quota: jobQuota,
          jobs_used: 0,
          prepaid_balance: basePrice,
          auto_renew: autoRenew,
          sales_agent_id: salesAgentId,
          referred_by: referredBy,
        },
      });

      // Get or create wallet
      const account = await WalletService.getOrCreateAccount('COMPANY', companyId);

      // Credit wallet with subscription value with pricing metadata
      await WalletService.creditAccount({
        accountId: account.id,
        amount: basePrice,
        type: VirtualTransactionType.SUBSCRIPTION_PURCHASE,
        description: `${name} subscription purchase (${billingCurrency} ${basePrice})`,
        referenceType: 'SUBSCRIPTION',
        referenceId: subscription.id,
        pricingPeg,
        billingCurrency,
        priceBookId,
        priceBookVersion,
      });

      console.log(`✅ Subscription created with regional pricing: ${billingCurrency} ${basePrice} (peg: ${pricingPeg})`);

      return subscription;
    });
  }

  static async getActiveSubscription(companyId: string) {
    return prisma.subscription.findFirst({
      where: {
        company_id: companyId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { created_at: 'desc' }
    });
  }

  static async listSubscriptions(companyId: string) {
    return prisma.subscription.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' }
    });
  }

  static async processJobPosting(companyId: string, jobTitle: string, userId: string) {
    // Logic to deduct job cost from subscription quota
    // 1. Find active subscription
    const subscription = await this.getActiveSubscription(companyId);
    if (!subscription) throw new Error('No active subscription');

    // 2. Check quota
    if (subscription.job_quota && subscription.jobs_used >= subscription.job_quota) {
        throw new Error('Job quota exceeded');
    }

    // 3. Calculate cost
    let jobCost = 0;
    if (subscription.job_quota && subscription.job_quota > 0) {
        jobCost = subscription.base_price / subscription.job_quota;
    }

    // 4. Deduct from wallet with currency info
    if (jobCost > 0) {
        const account = await WalletService.getOrCreateAccount('COMPANY', companyId);
        
        // Get currency info for audit
        const { pricingPeg, billingCurrency } = 
          await CurrencyAssignmentService.getCompanyCurrencies(companyId);
        
        await WalletService.debitAccount({
            accountId: account.id,
            amount: jobCost,
            type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
            description: `Job posting from subscription quota: ${jobTitle}`,
            referenceType: 'SUBSCRIPTION',
            referenceId: subscription.id,
            createdBy: userId,
            pricingPeg,
            billingCurrency: subscription.currency || billingCurrency,
        });
    }

    // 5. Update subscription usage
    return prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            jobs_used: { increment: 1 },
            prepaid_balance: { decrement: jobCost }
        }
    });
  }
}
