"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingAuditService = void 0;
const prisma_1 = require("../../utils/prisma");
/**
 * Pricing Audit Service
 * Records pricing decisions for compliance and audit trail
 *
 * Per HRM8 rules, every transaction must record:
 * - Pricing peg used
 * - Billing currency
 * - Price book ID + version
 * - Unit price
 * - Override ID (if applicable)
 */
class PricingAuditService {
    /**
     * Record pricing decision in transaction
     * Called when creating VirtualTransaction
     */
    static async recordPricingDecision(transactionId, pricingData) {
        await prisma_1.prisma.virtualTransaction.update({
            where: { id: transactionId },
            data: {
                pricing_peg_used: pricingData.pricingPeg,
                billing_currency_used: pricingData.billingCurrency,
                price_book_id: pricingData.priceBookId,
                price_book_version: pricingData.priceBookVersion,
                override_id: pricingData.overrideId
            }
        });
    }
    /**
     * Get pricing audit trail for a transaction
     */
    static async getTransactionPricingAudit(transactionId) {
        const transaction = await prisma_1.prisma.virtualTransaction.findUnique({
            where: { id: transactionId },
            select: {
                pricing_peg_used: true,
                billing_currency_used: true,
                price_book_id: true,
                price_book_version: true,
                override_id: true,
                amount: true,
                created_at: true
            }
        });
        return transaction;
    }
    /**
     * Get all transactions for a company with pricing audit data
     */
    static async getCompanyPricingAudit(companyId) {
        const transactions = await prisma_1.prisma.virtualTransaction.findMany({
            where: {
                virtual_account: {
                    owner_type: 'COMPANY',
                    owner_id: companyId
                }
            },
            select: {
                id: true,
                type: true,
                amount: true,
                direction: true,
                pricing_peg_used: true,
                billing_currency_used: true,
                price_book_id: true,
                price_book_version: true,
                override_id: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' }
        });
        return transactions;
    }
    /**
     * Validate pricing consistency for a company
     * Ensures all transactions use the same billing currency
     */
    static async validatePricingConsistency(companyId) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: { billing_currency: true }
        });
        if (!company) {
            return { isConsistent: false, issues: ['Company not found'] };
        }
        const transactions = await this.getCompanyPricingAudit(companyId);
        const issues = [];
        for (const tx of transactions) {
            if (tx.billing_currency_used && tx.billing_currency_used !== company.billing_currency) {
                issues.push(`Transaction ${tx.id} (${tx.created_at.toISOString()}) ` +
                    `used ${tx.billing_currency_used} but company billing currency is ${company.billing_currency}`);
            }
        }
        return {
            isConsistent: issues.length === 0,
            issues
        };
    }
}
exports.PricingAuditService = PricingAuditService;
