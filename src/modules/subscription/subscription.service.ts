import { prisma } from '../../utils/prisma';
import { WalletService } from '../wallet/wallet.service';
import { 
  SubscriptionPlanType, 
  SubscriptionStatus, 
  VirtualTransactionType 
} from '@prisma/client';

export interface CreateSubscriptionInput {
  companyId: string;
  planType: SubscriptionPlanType;
  name: string;
  basePrice: number;
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
   * Create a new subscription
   */
  static async createSubscription(input: CreateSubscriptionInput) {
    const {
      companyId,
      planType,
      name,
      basePrice,
      billingCycle,
      jobQuota,
      discountPercent = 0,
      salesAgentId,
      referredBy,
      autoRenew = true,
      startDate = new Date(),
    } = input;

    return await prisma.$transaction(async (tx) => {
      // Calculate end date
      const endDate = new Date(startDate);
      if (billingCycle === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      const renewalDate = new Date(endDate);

      // Create subscription
      const subscription = await tx.subscription.create({
        data: {
          company_id: companyId,
          name,
          plan_type: planType,
          status: SubscriptionStatus.ACTIVE,
          base_price: basePrice,
          currency: 'USD',
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

      // Credit wallet with subscription value (prepaid balance logic)
      // Note: The original logic credited the wallet. This implies the subscription purchase *loads* the wallet.
      // Or does it charge it? "Credit the virtual wallet with subscription amount" -> Deposit.
      // Usually you pay for a subscription and get credits.
      
      await WalletService.creditAccount({
        accountId: account.id,
        amount: basePrice,
        type: VirtualTransactionType.SUBSCRIPTION_PURCHASE,
        description: `${name} subscription purchase`,
        referenceType: 'SUBSCRIPTION',
        referenceId: subscription.id,
      });

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
    // Logic to deduct job cost
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

    // 4. Deduct from wallet
    if (jobCost > 0) {
        const account = await WalletService.getOrCreateAccount('COMPANY', companyId);
        await WalletService.debitAccount({
            accountId: account.id,
            amount: jobCost,
            type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
            description: `Job posting: ${jobTitle}`,
            referenceType: 'JOB', // or SUBSCRIPTION
            referenceId: subscription.id,
            createdBy: userId
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
