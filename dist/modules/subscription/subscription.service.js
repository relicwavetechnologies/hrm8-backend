"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const prisma_1 = require("../../utils/prisma");
const wallet_service_1 = require("../wallet/wallet.service");
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
                    base_price: basePrice,
                    currency, // Dynamic currency
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
                    price_book_id: priceBookId,
                    pricing_peg: pricingPeg,
                    price_book_version: priceBookVersion,
                },
            });
            // Get or create wallet
            const account = await wallet_service_1.WalletService.getOrCreateAccount('COMPANY', companyId);
            // Credit wallet with subscription value with pricing metadata
            await wallet_service_1.WalletService.creditAccount({
                accountId: account.id,
                amount: basePrice,
                type: client_1.VirtualTransactionType.SUBSCRIPTION_PURCHASE,
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
    static async processJobPosting(companyId, jobTitle, userId) {
        // Logic to deduct job cost from subscription quota
        // 1. Find active subscription
        const subscription = await this.getActiveSubscription(companyId);
        if (!subscription)
            throw new Error('No active subscription');
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
            const account = await wallet_service_1.WalletService.getOrCreateAccount('COMPANY', companyId);
            // Get currency info for audit
            const { pricingPeg, billingCurrency } = await currency_assignment_service_1.CurrencyAssignmentService.getCompanyCurrencies(companyId);
            await wallet_service_1.WalletService.debitAccount({
                accountId: account.id,
                amount: jobCost,
                type: client_1.VirtualTransactionType.JOB_POSTING_DEDUCTION,
                description: `Job posting from subscription quota: ${jobTitle}`,
                referenceType: 'SUBSCRIPTION',
                referenceId: subscription.id,
                createdBy: userId,
                pricingPeg,
                billingCurrency: subscription.currency || billingCurrency,
            });
        }
        // 5. Update subscription usage
        return prisma_1.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                jobs_used: { increment: 1 },
                prepaid_balance: { decrement: jobCost }
            }
        });
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
