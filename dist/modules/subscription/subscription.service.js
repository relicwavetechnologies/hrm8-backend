"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const prisma_1 = require("../../utils/prisma");
const client_1 = require("@prisma/client");
const currency_assignment_service_1 = require("../pricing/currency-assignment.service");
const price_book_selection_service_1 = require("../pricing/price-book-selection.service");
const PLAN_PERKS = {
    PAYG: { jobQuota: 0 },
    SMALL: { jobQuota: 5 },
    MEDIUM: { jobQuota: 25 },
    LARGE: { jobQuota: 50 },
    ENTERPRISE: { jobQuota: null }, // Unlimited
    RPO: { jobQuota: null },
};
class SubscriptionService {
    /**
     * Create a new subscription with dynamic regional pricing
     */
    static async createSubscription(input) {
        const { companyId, planType, name, basePrice: providedBasePrice, billingCycle, jobQuota: providedJobQuota, discountPercent = 0, salesAgentId, referredBy, autoRenew = true, startDate = new Date(), } = input;
        return await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Get company currency information
            const { pricingPeg, billingCurrency } = await currency_assignment_service_1.CurrencyAssignmentService.getCompanyCurrencies(companyId);
            const currency = billingCurrency ?? 'USD';
            // 2. Get subscription price from price book (regional pricing)
            let basePrice = providedBasePrice;
            let priceBookId;
            let priceBookVersion;
            const supportedPlanTypes = ['PAYG', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'RPO'];
            const canFetchPrice = supportedPlanTypes.includes(planType);
            if (!basePrice && canFetchPrice) {
                // Fetch price from price book
                const pricing = await price_book_selection_service_1.PriceBookSelectionService.getSubscriptionPrice(companyId, planType);
                basePrice = pricing.price;
                priceBookId = pricing.priceBook.id;
                priceBookVersion = pricing.priceBook.version ?? undefined;
            }
            else if (!basePrice) {
                throw new Error(`Base price required for plan type: ${planType}`);
            }
            else {
                // Get price book for audit even if price provided
                const priceBook = await price_book_selection_service_1.PriceBookSelectionService.getEffectivePriceBook(companyId);
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
            }
            else {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            const renewalDate = new Date(endDate);
            // Create subscription with dynamic pricing
            const subscription = await tx.subscription.create({
                data: {
                    company_id: companyId,
                    name,
                    plan_type: planType,
                    status: client_1.SubscriptionStatus.ACTIVE,
                    base_price: resolvedBasePrice,
                    currency, // Dynamic currency
                    billing_cycle: billingCycle,
                    discount_percent: discountPercent,
                    start_date: startDate,
                    end_date: endDate,
                    renewal_date: renewalDate,
                    job_quota: jobQuota,
                    jobs_used: 0,
                    prepaid_balance: resolvedBasePrice,
                    auto_renew: autoRenew,
                    sales_agent_id: salesAgentId,
                    referred_by: referredBy,
                    price_book_id: priceBookId,
                    pricing_peg: pricingPeg,
                    price_book_version: priceBookVersion,
                },
            });
            // Atomically create subscription-sale commission when a valid consultant attribution exists.
            const companyAttribution = await tx.company.findUnique({
                where: { id: companyId },
                select: { sales_agent_id: true, referred_by: true }
            });
            const commissionConsultantId = salesAgentId ||
                companyAttribution?.sales_agent_id ||
                companyAttribution?.referred_by ||
                null;
            if (commissionConsultantId) {
                const consultant = await tx.consultant.findUnique({
                    where: { id: commissionConsultantId },
                    select: { id: true, region_id: true, default_commission_rate: true }
                });
                if (consultant?.region_id) {
                    const commissionRate = consultant.default_commission_rate ?? 0.20;
                    const commissionAmount = Number((resolvedBasePrice * commissionRate).toFixed(2));
                    if (commissionAmount > 0) {
                        await tx.commission.create({
                            data: {
                                consultant_id: consultant.id,
                                region_id: consultant.region_id,
                                subscription_id: subscription.id,
                                type: 'SUBSCRIPTION_SALE',
                                amount: commissionAmount,
                                description: `Subscription sale commission for ${name}`,
                                status: client_1.CommissionStatus.PENDING,
                            }
                        });
                    }
                }
            }
            console.log(`✅ Subscription created with regional pricing snapshot: ${billingCurrency} ${resolvedBasePrice} (peg: ${pricingPeg})`);
            return subscription;
        });
    }
    static async getActiveSubscription(companyId) {
        return prisma_1.prisma.subscription.findFirst({
            where: {
                company_id: companyId,
                status: client_1.SubscriptionStatus.ACTIVE,
            },
            orderBy: { created_at: 'desc' }
        });
    }
    static async listSubscriptions(companyId) {
        return prisma_1.prisma.subscription.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' }
        });
    }
    static async processJobPosting(companyId, _jobTitle, _userId) {
        // Legacy compatibility wrapper:
        // Subscription-based publishing is quota-only and must not touch wallet.
        return this.useQuotaOnly(companyId);
    }
    /**
     * Use one quota slot from the active subscription.
     * This ONLY increments jobs_used — no wallet debit, no financial transaction.
     * Used exclusively for self-managed job publishing (System A).
     */
    static async useQuotaOnly(companyId) {
        const subscription = await this.getActiveSubscription(companyId);
        if (!subscription) {
            throw new Error('No active subscription found');
        }
        if (subscription.job_quota !== null &&
            subscription.job_quota !== undefined &&
            subscription.jobs_used >= subscription.job_quota) {
            throw new Error('Job quota exhausted');
        }
        return prisma_1.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                jobs_used: { increment: 1 },
            },
        });
    }
}
exports.SubscriptionService = SubscriptionService;
