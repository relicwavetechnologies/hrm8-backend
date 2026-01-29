import { BaseService } from '../../core/service';
import { SubscriptionRepository } from './subscription.repository';
import { WalletService } from '../wallet/wallet.service';
import {
  SubscriptionStatus,
  Prisma,
  BillingCycle
} from '@prisma/client';
import { CreateSubscriptionDTO, SubscriptionStats } from './subscription.types';
import { HttpException } from '../../core/http-exception';

export class SubscriptionService extends BaseService {
  private static repository = new SubscriptionRepository();

  constructor(repository?: SubscriptionRepository) {
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
      salesAgentId,
      referredBy,
      autoRenew = true,
      startDate = new Date(),
    } = input;

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    if (billingCycle === 'MONTHLY') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }
    const renewalDate = new Date(end);

    const subscription = await this.repository.create({
      company: { connect: { id: companyId } },
      name,
      plan_type: planType,
      status: SubscriptionStatus.ACTIVE,
      base_price: basePrice,
      currency: 'USD',
      billing_cycle: billingCycle,
      discount_percent: discountPercent,
      start_date: start,
      end_date: end,
      renewal_date: renewalDate,
      job_quota: jobQuota,
      jobs_used: 0,
      prepaid_balance: basePrice,
      auto_renew: autoRenew,
      consultant: salesAgentId ? { connect: { id: salesAgentId } } : undefined,
      referred_by: referredBy,
    });

    // Credit wallet with subscription value
    await WalletService.creditAccount({
      ownerType: 'COMPANY',
      ownerId: companyId,
      amount: basePrice,
      type: 'SUBSCRIPTION_PURCHASE',
      description: `${name} subscription purchase`,
      referenceType: 'SUBSCRIPTION',
      referenceId: subscription.id,
      accountId: '' // Optional now
    });

    return subscription;
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
        accountId: '' // Optional now
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
