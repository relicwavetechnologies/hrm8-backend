"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobPaymentService = exports.JobPaymentService = exports.UPGRADE_PRICE_MAP = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
const service_1 = require("../../core/service");
const wallet_service_1 = require("../wallet/wallet.service");
const currency_assignment_service_1 = require("../pricing/currency-assignment.service");
const price_book_selection_service_1 = require("../pricing/price-book-selection.service");
const salary_band_service_1 = require("../pricing/salary-band.service");
// Legacy hardcoded prices - kept for backward compatibility but not used
// Use getJobPrice() for dynamic pricing
exports.UPGRADE_PRICE_MAP = {
    shortlisting: { amount: 1990, currency: 'usd', label: 'Shortlisting' },
    full_service: { amount: 5990, currency: 'usd', label: 'Full Service' },
    executive_search: { amount: 9990, currency: 'usd', label: 'Executive Search' },
};
class JobPaymentService extends service_1.BaseService {
    /**
     * Get dynamic price for job posting based on salary and service type
     * Uses regional pricing and salary band detection
     */
    static async getJobPrice(companyId, salaryMax, serviceType) {
        // Check if executive search based on salary
        const bandInfo = await salary_band_service_1.SalaryBandService.determineJobBand(companyId, salaryMax);
        if (bandInfo.isExecutiveSearch && serviceType === 'executive-search') {
            // Use salary-band based pricing
            const priceBook = await price_book_selection_service_1.PriceBookSelectionService.getEffectivePriceBook(companyId);
            return {
                price: bandInfo.price,
                currency: bandInfo.currency,
                productCode: bandInfo.productCode,
                band: bandInfo.band,
                priceBookId: priceBook.id,
                priceBookVersion: priceBook.version || '2026-Q1',
            };
        }
        // Use standard recruitment pricing
        const serviceTypeMap = {
            'shortlisting': 'SHORTLISTING',
            'full-service': 'FULL',
            'executive-search': 'EXEC_BAND_1' // Lowest band if not qualified
        };
        const result = await price_book_selection_service_1.PriceBookSelectionService.getRecruitmentPrice(companyId, serviceTypeMap[serviceType]);
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
    static getPaymentAmount(servicePackage) {
        if (servicePackage === 'self-managed') {
            return null;
        }
        const packageKeyMap = {
            'shortlisting': 'shortlisting',
            'full-service': 'full_service',
            'executive-search': 'executive_search',
        };
        const packageKey = packageKeyMap[servicePackage] || servicePackage;
        const priceInfo = exports.UPGRADE_PRICE_MAP[packageKey.replace('-', '_')];
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
    static requiresPayment(servicePackage) {
        return servicePackage !== 'self-managed';
    }
    /**
     * Process payment for a job from wallet with dynamic regional pricing
     */
    async payForJobFromWallet(companyId, jobId, salaryMax, servicePackage, userId) {
        // Self-managed is free
        if (servicePackage === 'self-managed') {
            return { success: true };
        }
        try {
            // Get dynamic pricing
            const pricing = await JobPaymentService.getJobPrice(companyId, salaryMax, servicePackage);
            // Get currency info
            const { pricingPeg, billingCurrency } = await currency_assignment_service_1.CurrencyAssignmentService.getCompanyCurrencies(companyId);
            // Validate currency lock
            await currency_assignment_service_1.CurrencyAssignmentService.validateCurrencyLock(companyId, pricing.currency);
            return await prisma_1.prisma.$transaction(async (tx) => {
                // 1. Get account
                const account = await wallet_service_1.WalletService.getOrCreateAccount('COMPANY', companyId);
                // 2. Check balance
                if (account.balance < pricing.price) {
                    throw new Error(`Insufficient wallet balance. ` +
                        `Required: ${pricing.currency} ${pricing.price.toFixed(2)}, ` +
                        `Available: ${pricing.currency} ${account.balance.toFixed(2)}`);
                }
                // 3. Debit account with pricing metadata
                await wallet_service_1.WalletService.debitAccount({
                    accountId: account.id,
                    amount: pricing.price,
                    type: client_1.VirtualTransactionType.JOB_POSTING_DEDUCTION,
                    description: `Job posting payment (${servicePackage}${pricing.band ? ` - ${pricing.band}` : ''})`,
                    referenceType: 'JOB',
                    referenceId: jobId,
                    createdBy: userId,
                    pricingPeg,
                    billingCurrency: pricing.currency,
                    priceBookId: pricing.priceBookId,
                    priceBookVersion: pricing.priceBookVersion,
                });
                // Lock currency on first transaction
                try {
                    await currency_assignment_service_1.CurrencyAssignmentService.lockCurrency(companyId);
                }
                catch (error) {
                    // Already locked - continue
                }
                // 4. Update job payment status
                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        payment_status: 'PAID',
                        payment_amount: pricing.price,
                        payment_currency: pricing.currency,
                        payment_completed_at: new Date(),
                        price_book_id: pricing.priceBookId,
                        pricing_peg: pricingPeg,
                        price_book_version: pricing.priceBookVersion,
                    }
                });
                console.log(`✅ Job payment processed: ${pricing.currency} ${pricing.price}${pricing.band ? ` (${pricing.band})` : ''}`);
                return { success: true, pricing };
            });
        }
        catch (error) {
            console.error('Job payment failed:', error);
            return { success: false, error: error.message || 'Payment failed' };
        }
    }
}
exports.JobPaymentService = JobPaymentService;
exports.jobPaymentService = new JobPaymentService();
