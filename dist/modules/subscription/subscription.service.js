"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const prisma_1 = require("../../utils/prisma");
const client_1 = require("@prisma/client");
const currency_assignment_service_1 = require("../pricing/currency-assignment.service");
const price_book_selection_service_1 = require("../pricing/price-book-selection.service");
const commission_rate_util_1 = require("../hrm8/commission-rate.util");
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
            const normalizedSalesAgentId = typeof salesAgentId === 'string' && salesAgentId.trim().length > 0
                ? salesAgentId.trim()
                : undefined;
            // Resolve company-level attribution once; used for subscription snapshot + commission fallback.
            const companyAttribution = await tx.company.findUnique({
                where: { id: companyId },
                select: { sales_agent_id: true, referred_by: true }
            });
            // Never write invalid consultant IDs to sales_agent_id.
            let validatedInputSalesAgentId = null;
            if (normalizedSalesAgentId) {
                const consultant = await tx.consultant.findUnique({
                    where: { id: normalizedSalesAgentId },
                    select: { id: true }
                });
                if (consultant?.id) {
                    validatedInputSalesAgentId = consultant.id;
                }
                else {
                    console.warn(`[SubscriptionService] Ignoring invalid salesAgentId "${normalizedSalesAgentId}" for company ${companyId}`);
                }
            }
            let validatedCompanySalesAgentId = null;
            if (companyAttribution?.sales_agent_id) {
                const consultant = await tx.consultant.findUnique({
                    where: { id: companyAttribution.sales_agent_id },
                    select: { id: true }
                });
                if (consultant?.id) {
                    validatedCompanySalesAgentId = consultant.id;
                }
                else {
                    console.warn(`[SubscriptionService] Ignoring invalid company.sales_agent_id "${companyAttribution.sales_agent_id}" for company ${companyId}`);
                }
            }
            const resolvedSalesAgentId = validatedInputSalesAgentId ||
                validatedCompanySalesAgentId ||
                null;
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
                    sales_agent_id: resolvedSalesAgentId,
                    referred_by: referredBy,
                    price_book_id: priceBookId,
                    pricing_peg: pricingPeg,
                    price_book_version: priceBookVersion,
                },
            });
            // Atomically create subscription-sale commission with first-payment guard for converted companies.
            const approvedConversionRequest = await tx.leadConversionRequest.findFirst({
                where: {
                    company_id: companyId,
                    status: { in: ['APPROVED', 'CONVERTED'] },
                },
                orderBy: [{ converted_at: 'desc' }, { created_at: 'desc' }],
                select: {
                    id: true,
                    consultant_id: true,
                },
            });
            const conversionAttributedConsultantId = approvedConversionRequest?.consultant_id || null;
            const commissionConsultantId = conversionAttributedConsultantId ||
                resolvedSalesAgentId ||
                companyAttribution?.sales_agent_id ||
                companyAttribution?.referred_by ||
                null;
            if (commissionConsultantId) {
                const consultant = await tx.consultant.findUnique({
                    where: { id: commissionConsultantId },
                    select: { id: true, region_id: true, default_commission_rate: true }
                });
                if (consultant?.region_id) {
                    const existingCommission = await tx.commission.findFirst({
                        where: {
                            consultant_id: consultant.id,
                            type: 'SUBSCRIPTION_SALE',
                            subscription: {
                                company_id: companyId,
                            },
                        },
                        select: { id: true },
                    });
                    let isEligiblePaymentEvent = true;
                    // For converted-company attribution, commission can only be created
                    // on the first successful payment event for that converted company.
                    if (conversionAttributedConsultantId) {
                        const [previousSubscription, firstPaidBill, firstManagedWalletDebit] = await Promise.all([
                            tx.subscription.findFirst({
                                where: {
                                    company_id: companyId,
                                    id: { not: subscription.id },
                                    created_at: { lt: subscription.created_at },
                                },
                                select: { id: true },
                            }),
                            tx.bill.findFirst({
                                where: {
                                    company_id: companyId,
                                    status: client_1.BillStatus.PAID,
                                },
                                select: { id: true },
                            }),
                            tx.virtualTransaction.findFirst({
                                where: {
                                    virtual_account: {
                                        owner_type: client_1.VirtualAccountOwner.COMPANY,
                                        owner_id: companyId,
                                    },
                                    type: client_1.VirtualTransactionType.JOB_POSTING_DEDUCTION,
                                    status: client_1.TransactionStatus.COMPLETED,
                                    reference_type: 'JOB',
                                },
                                select: { id: true },
                            }),
                        ]);
                        isEligiblePaymentEvent = !previousSubscription && !firstPaidBill && !firstManagedWalletDebit;
                    }
                    const commissionRate = (0, commission_rate_util_1.toCommissionRateDecimal)(consultant.default_commission_rate, 0.20);
                    const commissionAmount = Number((resolvedBasePrice * commissionRate).toFixed(2));
                    if (!existingCommission && isEligiblePaymentEvent && commissionAmount > 0) {
                        await tx.commission.create({
                            data: {
                                consultant_id: consultant.id,
                                region_id: consultant.region_id,
                                subscription_id: subscription.id,
                                type: 'SUBSCRIPTION_SALE',
                                amount: commissionAmount,
                                currency: billingCurrency,
                                payout_currency: billingCurrency,
                                payout_amount: commissionAmount,
                                fx_rate: 1.0,
                                fx_source: 'SAME_REGION',
                                rate: commissionRate,
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
