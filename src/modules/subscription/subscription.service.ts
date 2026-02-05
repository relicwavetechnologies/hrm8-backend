import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';
import { SubscriptionRepository } from './subscription.repository';
import { WalletService } from '../wallet/wallet.service';
import {
  SubscriptionStatus,
  Prisma,
  BillingCycle,
  SubscriptionPlanType,
  VirtualTransactionType
} from '@prisma/client';
import { CreateSubscriptionDTO, SubscriptionStats } from './subscription.types';
import { HttpException } from '../../core/http-exception';

export class SubscriptionService extends BaseService {
  private static repository = new SubscriptionRepository();

  constructor() {
    super();
  }

  static async createSubscription(input: CreateSubscriptionDTO) {
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

      const endDate = new Date(startDate);
      if (billingCycle === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      const renewalDate = new Date(endDate);

      const subscription = await tx.subscription.create({
        data: {
          company_id: companyId,
          name,
          plan_type: planType as SubscriptionPlanType,
          status: SubscriptionStatus.ACTIVE,
          base_price: finalBasePrice,
          currency: 'USD',
          billing_cycle: billingCycle as BillingCycle,
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

      const account = await WalletService.getOrCreateAccount('COMPANY', companyId);

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
    return this.repository.findActiveByCompany(companyId);
  }

  static async getSubscriptionDetails(id: string) {
    const subscription = await this.repository.findById(id);
    if (!subscription) throw new HttpException(404, 'Subscription not found');
    return subscription;
  }

  static async listSubscriptions(companyId: string) {
    return this.repository.findManyByCompany(companyId);
  }

  static async getSubscriptionStats(id: string): Promise<SubscriptionStats> {
    const sub = await this.getSubscriptionDetails(id);

    let daysRemaining = null;
    if (sub.end_date) {
      const diff = sub.end_date.getTime() - new Date().getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      jobsUsed: sub.jobs_used,
      jobQuota: sub.job_quota,
      quotaRemaining: sub.job_quota ? sub.job_quota - sub.jobs_used : null,
      prepaidBalance: sub.prepaid_balance,
      daysRemaining
    };
  }

  static async cancelSubscription(id: string) {
    return this.repository.update(id, {
      status: SubscriptionStatus.CANCELLED,
      cancelled_at: new Date(),
      auto_renew: false
    });
  }

  static async renewSubscription(id: string) {
    const sub = await this.getSubscriptionDetails(id);
    if (sub.status !== SubscriptionStatus.ACTIVE && sub.status !== SubscriptionStatus.EXPIRED) {
      throw new HttpException(400, 'Only active or expired subscriptions can be renewed');
    }

    const newEnd = new Date(sub.end_date || new Date());
    if (sub.billing_cycle === 'MONTHLY') {
      newEnd.setMonth(newEnd.getMonth() + 1);
    } else {
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    }

    return this.repository.update(id, {
      status: SubscriptionStatus.ACTIVE,
      end_date: newEnd,
      renewal_date: newEnd,
      jobs_used: 0,
      prepaid_balance: sub.base_price
    });
  }

  static async processJobPosting(companyId: string, jobTitle: string, userId: string) {
    const subscription = await this.getActiveSubscription(companyId);
    if (!subscription) throw new HttpException(404, 'No active subscription');

    if (subscription.job_quota && subscription.jobs_used >= subscription.job_quota) {
      throw new HttpException(402, 'Job quota exceeded');
    }

    let jobCost = 0;
    if (subscription.job_quota && subscription.job_quota > 0) {
      jobCost = subscription.base_price / subscription.job_quota;
    }

    if (jobCost > 0) {
      await WalletService.debitAccount({
        ownerType: 'COMPANY',
        ownerId: companyId,
        amount: jobCost,
        type: 'JOB_POSTING_DEDUCTION',
        description: `Job posting: ${jobTitle}`,
        referenceType: 'JOB',
        referenceId: subscription.id,
        createdBy: userId,
        accountId: ''
      });
    }

    return this.repository.update(subscription.id, {
      jobs_used: { increment: 1 },
      prepaid_balance: { decrement: jobCost }
    });
  }

  // Instance methods proxying to static
  async createSubscription(input: CreateSubscriptionDTO) {
    return SubscriptionService.createSubscription(input);
  }

  async getActiveSubscription(companyId: string) {
    return SubscriptionService.getActiveSubscription(companyId);
  }

  async getSubscriptionDetails(id: string) {
    return SubscriptionService.getSubscriptionDetails(id);
  }

  async listSubscriptions(companyId: string) {
    return SubscriptionService.listSubscriptions(companyId);
  }

  async getSubscriptionStats(id: string) {
    return SubscriptionService.getSubscriptionStats(id);
  }

  async cancelSubscription(id: string) {
    return SubscriptionService.cancelSubscription(id);
  }

  async renewSubscription(id: string) {
    return SubscriptionService.renewSubscription(id);
  }

  async processJobPosting(companyId: string, jobTitle: string, userId: string) {
    return SubscriptionService.processJobPosting(companyId, jobTitle, userId);
  }
}
