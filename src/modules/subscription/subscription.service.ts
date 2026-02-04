import { prisma } from '../../utils/prisma';
import type { Prisma } from '@prisma/client';
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
  promoCode?: string;
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
      promoCode,
      salesAgentId,
      referredBy,
      autoRenew = true,
      startDate = new Date(),
    } = input;

    return await prisma.$transaction(async (tx) => {
      let appliedDiscountPercent = discountPercent;
      let finalBasePrice = basePrice;
      let promoMetadata: Record<string, unknown> | null = null;

      if (promoCode) {
        const code = promoCode.trim().toUpperCase();
        const promo = await tx.promoCode.findUnique({ where: { code } });

        if (!promo) {
          throw new Error('Invalid promo code');
        }

        if (!promo.is_active) {
          throw new Error('Promo code is inactive');
        }

        const now = new Date();
        if (promo.start_date > now) {
          throw new Error('Promo code is not active yet');
        }
        if (promo.end_date && promo.end_date < now) {
          throw new Error('Promo code has expired');
        }
        if (promo.max_uses && promo.used_count >= promo.max_uses) {
          throw new Error('Promo code usage limit reached');
        }

        if (promo.discount_type === 'PERCENT') {
          appliedDiscountPercent = promo.discount_value;
          finalBasePrice = Math.max(0, basePrice - (basePrice * (promo.discount_value / 100)));
        } else {
          appliedDiscountPercent = 0;
          finalBasePrice = Math.max(0, basePrice - promo.discount_value);
        }

        promoMetadata = {
          promo_code_id: promo.id,
          promo_code: promo.code,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          original_base_price: basePrice,
          discounted_base_price: finalBasePrice,
        };

        await tx.promoCode.update({
          where: { id: promo.id },
          data: { used_count: { increment: 1 } },
        });
      }

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
          base_price: finalBasePrice,
          currency: 'USD',
          billing_cycle: billingCycle,
          discount_percent: appliedDiscountPercent,
          start_date: startDate,
          end_date: endDate,
          renewal_date: renewalDate,
          job_quota: jobQuota,
          jobs_used: 0,
          prepaid_balance: finalBasePrice,
          auto_renew: autoRenew,
          sales_agent_id: salesAgentId,
          referred_by: referredBy,
          custom_pricing: promoMetadata ? (promoMetadata as Prisma.InputJsonValue) : undefined,
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
        amount: finalBasePrice,
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
