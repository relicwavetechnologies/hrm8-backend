import { prisma } from '../../utils/prisma';
import {
  BillStatus,
  CommissionStatus,
  SubscriptionPlanType,
  SubscriptionStatus,
  TransactionStatus,
  VirtualAccountOwner,
  VirtualTransactionType,
} from '@prisma/client';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';
import { PriceBookSelectionService } from '../pricing/price-book-selection.service';
import { toCommissionRateDecimal } from '../hrm8/commission-rate.util';
import { resolveCommissionFx } from '../hrm8/commission-fx.util';

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

const PLAN_PERKS: Record<string, { jobQuota: number | null }> = {
  PAYG: { jobQuota: 0 },
  SMALL: { jobQuota: 5 },
  MEDIUM: { jobQuota: 25 },
  LARGE: { jobQuota: 50 },
  ENTERPRISE: { jobQuota: null }, // Unlimited
  RPO: { jobQuota: null },
};

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
      jobQuota: providedJobQuota,
      discountPercent = 0,
      salesAgentId,
      referredBy,
      autoRenew = true,
      startDate = new Date(),
    } = input;

    const subscription = await prisma.$transaction(async (tx) => {
      const normalizedSalesAgentId =
        typeof salesAgentId === 'string' && salesAgentId.trim().length > 0
          ? salesAgentId.trim()
          : undefined;

      // Resolve company-level attribution once; used for subscription snapshot + commission fallback.
      const companyAttribution = await tx.company.findUnique({
        where: { id: companyId },
        select: { sales_agent_id: true, referred_by: true }
      });

      // Never write invalid consultant IDs to sales_agent_id.
      let validatedInputSalesAgentId: string | null = null;
      if (normalizedSalesAgentId) {
        const consultant = await tx.consultant.findUnique({
          where: { id: normalizedSalesAgentId },
          select: { id: true }
        });
        if (consultant?.id) {
          validatedInputSalesAgentId = consultant.id;
        } else {
          console.warn(
            `[SubscriptionService] Ignoring invalid salesAgentId "${normalizedSalesAgentId}" for company ${companyId}`
          );
        }
      }

      let validatedCompanySalesAgentId: string | null = null;
      if (companyAttribution?.sales_agent_id) {
        const consultant = await tx.consultant.findUnique({
          where: { id: companyAttribution.sales_agent_id },
          select: { id: true }
        });
        if (consultant?.id) {
          validatedCompanySalesAgentId = consultant.id;
        } else {
          console.warn(
            `[SubscriptionService] Ignoring invalid company.sales_agent_id "${companyAttribution.sales_agent_id}" for company ${companyId}`
          );
        }
      }

      const resolvedSalesAgentId =
        validatedInputSalesAgentId ||
        validatedCompanySalesAgentId ||
        null;

      // 1. Get company currency information
      const { pricingPeg, billingCurrency } =
        await CurrencyAssignmentService.getCompanyCurrencies(companyId);
      const currency = billingCurrency ?? 'USD';

      // 2. Get subscription price from price book (regional pricing)
      let basePrice = providedBasePrice;
      let priceBookId: string | undefined;
      let priceBookVersion: string | undefined;

      const supportedPlanTypes = ['PAYG', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'RPO'] as const;
      const canFetchPrice = supportedPlanTypes.includes(planType as typeof supportedPlanTypes[number]);

      if (!basePrice && canFetchPrice) {
        // Fetch price from price book
        const pricing = await PriceBookSelectionService.getSubscriptionPrice(
          companyId,
          planType as 'PAYG' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE' | 'RPO'
        );
        basePrice = pricing.price;
        priceBookId = pricing.priceBook.id;
        priceBookVersion = pricing.priceBook.version ?? undefined;
      } else if (!basePrice) {
        throw new Error(`Base price required for plan type: ${planType}`);
      } else {
        // Get price book for audit even if price provided
        const priceBook = await PriceBookSelectionService.getEffectivePriceBook(companyId);
        priceBookId = priceBook.id;
        priceBookVersion = priceBook.version ?? undefined;
      }
      const resolvedBasePrice = Number(basePrice);

      // Default jobQuota from plan perks if not provided
      const jobQuota = providedJobQuota !== undefined
        ? providedJobQuota
        : (PLAN_PERKS[planType]?.jobQuota ?? null);

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
          base_price: resolvedBasePrice,
          currency,  // Dynamic currency
          billing_cycle: billingCycle,
          discount_percent: discountPercent,
          start_date: startDate,
          end_date: endDate,
          renewal_date: renewalDate,
          job_quota: jobQuota,
          jobs_used: 0,
          prepaid_balance: resolvedBasePrice,
          auto_renew: autoRenew,
          sales_agent_id: resolvedSalesAgentId,
          referred_by: referredBy,
          price_book_id: priceBookId,
          pricing_peg: pricingPeg,
          price_book_version: priceBookVersion,
        },
      });

      console.log(`✅ Subscription created with regional pricing snapshot: ${billingCurrency} ${resolvedBasePrice} (peg: ${pricingPeg})`);

      return subscription;
    });

    // Create subscription-sale commission outside transaction to avoid "Transaction not found"
    // (external services use prisma directly; long tx with mixed usage can invalidate the transaction)
    try {
      await this.createSubscriptionSaleCommission(subscription, companyId);
    } catch (commErr: unknown) {
      console.warn('[SubscriptionService] Commission creation failed (subscription already created):', commErr);
    }
    return subscription;
  }

  /**
   * Create a subscription-sale commission. Runs outside any transaction so it doesn't conflict
   * with external services (CurrencyAssignmentService, PriceBookSelectionService) that use prisma.
   */
  private static async createSubscriptionSaleCommission(
    subscription: {
      id: string;
      company_id: string;
      base_price: number;
      currency: string;
      name: string;
      sales_agent_id: string | null;
      referred_by: string | null;
      created_at: Date;
    },
    companyId: string
  ): Promise<void> {
    const approvedConversionRequest = await prisma.leadConversionRequest.findFirst({
      where: {
        company_id: companyId,
        status: { in: ['APPROVED', 'CONVERTED'] },
      },
      orderBy: [{ converted_at: 'desc' }, { created_at: 'desc' }],
      select: { consultant_id: true },
    });

    const companyAttribution = await prisma.company.findUnique({
      where: { id: companyId },
      select: { sales_agent_id: true, referred_by: true },
    });

    const conversionAttributedConsultantId = approvedConversionRequest?.consultant_id ?? null;
    const commissionConsultantId =
      conversionAttributedConsultantId ||
      subscription.sales_agent_id ||
      companyAttribution?.sales_agent_id ||
      companyAttribution?.referred_by ||
      subscription.referred_by ||
      null;

    if (!commissionConsultantId) return;

    const consultant = await prisma.consultant.findUnique({
      where: { id: commissionConsultantId },
      select: { id: true, region_id: true, default_commission_rate: true },
    });

    if (!consultant?.region_id) return;

    const existingCommission = await prisma.commission.findFirst({
      where: {
        consultant_id: consultant.id,
        type: 'SUBSCRIPTION_SALE',
        subscription: { company_id: companyId },
      },
      select: { id: true },
    });

    let isEligiblePaymentEvent = true;
    if (conversionAttributedConsultantId) {
      const [previousSubscription, firstPaidBill, firstManagedWalletDebit] = await Promise.all([
        prisma.subscription.findFirst({
          where: {
            company_id: companyId,
            id: { not: subscription.id },
            created_at: { lt: subscription.created_at },
          },
          select: { id: true },
        }),
        prisma.bill.findFirst({
          where: { company_id: companyId, status: BillStatus.PAID },
          select: { id: true },
        }),
        prisma.virtualTransaction.findFirst({
          where: {
            virtual_account: { owner_type: VirtualAccountOwner.COMPANY, owner_id: companyId },
            type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
            status: TransactionStatus.COMPLETED,
            reference_type: 'JOB',
          },
          select: { id: true },
        }),
      ]);
      isEligiblePaymentEvent = !previousSubscription && !firstPaidBill && !firstManagedWalletDebit;
    }

    const commissionRate = toCommissionRateDecimal(consultant.default_commission_rate, 0.2);
    const commissionAmount = Number((subscription.base_price * commissionRate).toFixed(2));
    const billingCurrency = subscription.currency ?? 'USD';
    const fx = await resolveCommissionFx(consultant.id, billingCurrency, commissionAmount);

    if (!existingCommission && isEligiblePaymentEvent && commissionAmount > 0) {
      await prisma.commission.create({
        data: {
          consultant_id: consultant.id,
          region_id: consultant.region_id,
          subscription_id: subscription.id,
          type: 'SUBSCRIPTION_SALE',
          amount: commissionAmount,
          currency: fx.currency,
          payout_currency: fx.payoutCurrency,
          payout_amount: fx.payoutAmount,
          fx_rate: fx.fxRate,
          fx_rate_locked_at: new Date(),
          fx_source: fx.fxSource,
          rate: commissionRate,
          description: `Subscription sale commission for ${subscription.name} (${fx.currency})`,
          status: CommissionStatus.PENDING,
        },
      });
    }
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

  static async processJobPosting(companyId: string, _jobTitle: string, _userId: string) {
    // Legacy compatibility wrapper:
    // Subscription-based publishing is quota-only and must not touch wallet.
    return this.useQuotaOnly(companyId);
  }

  /**
   * Use one quota slot from the active subscription.
   * This ONLY increments jobs_used — no wallet debit, no financial transaction.
   * Used exclusively for self-managed job publishing (System A).
   */
  static async useQuotaOnly(companyId: string) {
    const subscription = await this.getActiveSubscription(companyId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (
      subscription.job_quota !== null &&
      subscription.job_quota !== undefined &&
      subscription.jobs_used >= subscription.job_quota
    ) {
      throw new Error('Job quota exhausted');
    }

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        jobs_used: { increment: 1 },
      },
    });
  }
}
