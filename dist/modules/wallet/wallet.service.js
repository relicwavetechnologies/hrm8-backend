"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const currency_assignment_service_1 = require("../pricing/currency-assignment.service");
class WalletService {
    /**
     * Get or create a wallet account for an owner
     */
    static async getOrCreateAccount(ownerType, ownerId) {
        let account = await prisma_1.prisma.virtualAccount.findUnique({
            where: {
                owner_type_owner_id: {
                    owner_type: ownerType,
                    owner_id: ownerId
                }
            }
        });
        if (!account) {
            account = await prisma_1.prisma.virtualAccount.create({
                data: {
                    owner_type: ownerType,
                    owner_id: ownerId,
                    balance: 0,
                    status: 'ACTIVE'
                }
            });
        }
        return account;
    }
    /**
     * Get wallet account details
     */
    static async getAccount(ownerType, ownerId) {
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        return {
            id: account.id,
            ownerType: account.owner_type,
            ownerId: account.owner_id,
            balance: account.balance,
            totalCredits: account.total_credits || 0,
            totalDebits: account.total_debits || 0,
            currency: 'USD',
            status: account.status,
            createdAt: account.created_at,
            updatedAt: account.updated_at
        };
    }
    /**
     * Verify wallet integrity and access
     */
    static async verifyWallet(ownerType, ownerId) {
        try {
            const account = await this.getOrCreateAccount(ownerType, ownerId);
            if (account.status !== 'ACTIVE') {
                throw new http_exception_1.HttpException(403, 'Wallet account is not active');
            }
            return {
                isValid: true,
                accountId: account.id,
                status: account.status,
                message: 'Wallet verified successfully'
            };
        }
        catch (error) {
            if (error.statusCode)
                throw error;
            throw new http_exception_1.HttpException(400, 'Wallet verification failed');
        }
    }
    /**
     * Get wallet balance
     */
    static async getBalance(ownerType, ownerId) {
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        return {
            balance: account.balance,
            totalCredits: account.total_credits || 0,
            totalDebits: account.total_debits || 0,
            currency: 'USD',
            status: account.status
        };
    }
    /**
     * Get transaction history
     */
    static async getTransactions(ownerType, ownerId, options = {}) {
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        const where = { virtual_account_id: account.id };
        if (options.type)
            where.type = options.type;
        const transactions = await prisma_1.prisma.virtualTransaction.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: options.limit || 50,
            skip: options.offset || 0
        });
        const total = await prisma_1.prisma.virtualTransaction.count({ where });
        return {
            transactions,
            total,
            limit: options.limit || 50,
            offset: options.offset || 0
        };
    }
    /**
     * Credit account (Deposit/Earnings)
     */
    static async creditAccount(params) {
        if (params.amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Amount must be positive');
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            const account = await tx.virtualAccount.findUnique({ where: { id: params.accountId } });
            if (!account)
                throw new http_exception_1.HttpException(404, 'Account not found');
            // Lock currency on first transaction for companies
            if (account.owner_type === 'COMPANY' && params.billingCurrency) {
                try {
                    await currency_assignment_service_1.CurrencyAssignmentService.lockCurrency(account.owner_id);
                }
                catch (error) {
                    // Already locked or error - continue
                }
            }
            const newBalance = account.balance + params.amount;
            const transaction = await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: account.id,
                    type: params.type,
                    amount: params.amount,
                    balance_after: newBalance,
                    direction: 'CREDIT',
                    status: 'COMPLETED',
                    description: params.description,
                    reference_id: params.referenceId,
                    reference_type: params.referenceType,
                    created_by: params.createdBy,
                    pricing_peg_used: params.pricingPeg,
                    billing_currency_used: params.billingCurrency,
                    price_book_id: params.priceBookId,
                    price_book_version: params.priceBookVersion
                }
            });
            await tx.virtualAccount.update({
                where: { id: account.id },
                data: {
                    balance: newBalance,
                    total_credits: { increment: params.amount }
                }
            });
            return transaction;
        });
    }
    /**
     * Debit account (Payment/Withdrawal)
     */
    static async debitAccount(params) {
        if (params.amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Amount must be positive');
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            const account = await tx.virtualAccount.findUnique({ where: { id: params.accountId } });
            if (!account)
                throw new http_exception_1.HttpException(404, 'Account not found');
            // Validate currency lock for companies
            if (account.owner_type === 'COMPANY' && params.billingCurrency) {
                await currency_assignment_service_1.CurrencyAssignmentService.validateCurrencyLock(account.owner_id, params.billingCurrency);
            }
            if (account.balance < params.amount) {
                throw new http_exception_1.HttpException(400, 'Insufficient balance');
            }
            // Lock currency on first transaction for companies
            if (account.owner_type === 'COMPANY' && params.billingCurrency) {
                try {
                    await currency_assignment_service_1.CurrencyAssignmentService.lockCurrency(account.owner_id);
                }
                catch (error) {
                    // Already locked - continue
                }
            }
            const newBalance = account.balance - params.amount;
            const transaction = await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: account.id,
                    type: params.type,
                    amount: params.amount,
                    balance_after: newBalance,
                    direction: 'DEBIT',
                    status: 'COMPLETED',
                    description: params.description,
                    reference_id: params.referenceId,
                    reference_type: params.referenceType,
                    created_by: params.createdBy,
                    pricing_peg_used: params.pricingPeg,
                    billing_currency_used: params.billingCurrency,
                    price_book_id: params.priceBookId,
                    price_book_version: params.priceBookVersion
                }
            });
            await tx.virtualAccount.update({
                where: { id: account.id },
                data: {
                    balance: newBalance,
                    total_debits: { increment: params.amount }
                }
            });
            return transaction;
        });
    }
    /**
     * Get user earnings summary
     */
    static async getEarnings(ownerType, ownerId) {
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        const earnings = await prisma_1.prisma.virtualTransaction.findMany({
            where: {
                virtual_account_id: account.id,
                direction: 'CREDIT',
                status: 'COMPLETED'
            },
            orderBy: { created_at: 'desc' }
        });
        const totalEarnings = earnings.reduce((sum, t) => sum + (t.amount || 0), 0);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentEarnings = earnings
            .filter(t => t.created_at > thirtyDaysAgo)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        return {
            totalEarnings,
            recentEarnings,
            period30Days: '30 days',
            transactionCount: earnings.length,
            currentBalance: account.balance
        };
    }
    /**
     * Request withdrawal from wallet
     */
    static async requestWithdrawal(ownerType, ownerId, data) {
        if (data.amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Amount must be positive');
        }
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        if (account.balance < data.amount) {
            throw new http_exception_1.HttpException(400, 'Insufficient balance for withdrawal');
        }
        const withdrawal = await prisma_1.prisma.virtualTransaction.create({
            data: {
                virtual_account_id: account.id,
                type: 'COMMISSION_WITHDRAWAL',
                amount: data.amount,
                balance_after: account.balance - data.amount,
                direction: 'DEBIT',
                status: 'PENDING',
                description: `Withdrawal request - ${data.paymentMethod}`,
                reference_type: 'WITHDRAWAL_REQUEST',
                metadata: {
                    paymentMethod: data.paymentMethod,
                    bankDetails: data.bankDetails,
                    notes: data.notes
                }
            }
        });
        return {
            id: withdrawal.id,
            amount: withdrawal.amount,
            status: withdrawal.status,
            paymentMethod: data.paymentMethod,
            createdAt: withdrawal.created_at
        };
    }
    /**
     * Get withdrawal history
     */
    static async getWithdrawalHistory(ownerType, ownerId) {
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        const withdrawals = await prisma_1.prisma.virtualTransaction.findMany({
            where: {
                virtual_account_id: account.id,
                type: 'COMMISSION_WITHDRAWAL'
            },
            orderBy: { created_at: 'desc' }
        });
        return {
            withdrawals: withdrawals.map(w => ({
                id: w.id,
                amount: w.amount,
                status: w.status,
                createdAt: w.created_at,
                completedAt: w.status === 'COMPLETED' ? w.created_at : null
            })),
            total: withdrawals.length
        };
    }
    /**
     * Request refund
     */
    static async requestRefund(ownerType, ownerId, data) {
        // Get the transaction to find the amount
        const transaction = await prisma_1.prisma.virtualTransaction.findUnique({
            where: { id: data.transactionId }
        });
        if (!transaction) {
            throw new http_exception_1.HttpException(404, 'Transaction not found');
        }
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        // For TransactionRefundRequest, we need company_id, transaction_id, transaction_type
        const refundRequest = await prisma_1.prisma.transactionRefundRequest.create({
            data: {
                company_id: ownerType === 'COMPANY' ? ownerId : 'global',
                transaction_id: data.transactionId,
                transaction_type: transaction.type,
                amount: transaction.amount,
                reason: data.reason,
                status: 'PENDING'
            }
        });
        return {
            id: refundRequest.id,
            amount: refundRequest.amount,
            status: refundRequest.status,
            reason: refundRequest.reason,
            createdAt: refundRequest.created_at
        };
    }
    /**
     * Get refund history
     */
    static async getRefundHistory(ownerType, ownerId) {
        const refunds = await prisma_1.prisma.transactionRefundRequest.findMany({
            where: { company_id: ownerType === 'COMPANY' ? ownerId : 'global' },
            orderBy: { created_at: 'desc' }
        });
        return refunds.map(r => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            reason: r.reason,
            requestedAt: r.created_at,
            processedAt: r.processed_at
        }));
    }
    /**
     * Get subscriptions for account owner
     */
    static async getSubscriptions(ownerType, ownerId) {
        const subscriptions = await prisma_1.prisma.subscription.findMany({
            where: {
                company_id: ownerType === 'COMPANY' ? ownerId : undefined
            },
            orderBy: { created_at: 'desc' }
        });
        return {
            subscriptions: subscriptions.map(s => ({
                id: s.id,
                name: s.name,
                status: s.status,
                amount: s.base_price,
                billingCycle: s.billing_cycle,
                nextBillingDate: s.renewal_date,
                createdAt: s.created_at
            })),
            total: subscriptions.length
        };
    }
    /**
     * Get specific subscription
     */
    static async getSubscription(subscriptionId) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { id: subscriptionId }
        });
        if (!subscription) {
            throw new http_exception_1.HttpException(404, 'Subscription not found');
        }
        return {
            id: subscription.id,
            name: subscription.name,
            status: subscription.status,
            amount: subscription.base_price,
            billingCycle: subscription.billing_cycle,
            nextBillingDate: subscription.renewal_date,
            createdAt: subscription.created_at,
            updatedAt: subscription.updated_at
        };
    }
    /**
     * Create subscription
     */
    static async createSubscription(ownerType, ownerId, data) {
        if (data.amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Subscription amount must be positive');
        }
        const subscription = await prisma_1.prisma.subscription.create({
            data: {
                company_id: ownerType === 'COMPANY' ? ownerId : 'global',
                name: data.name,
                base_price: data.amount,
                billing_cycle: data.billingCycle || 'MONTHLY',
                plan_type: 'BASIC',
                status: 'ACTIVE',
                start_date: new Date(),
                renewal_date: new Date()
            }
        });
        return {
            id: subscription.id,
            name: subscription.name,
            amount: subscription.base_price,
            billingCycle: subscription.billing_cycle,
            status: subscription.status
        };
    }
    /**
     * Renew subscription
     */
    static async renewSubscription(subscriptionId) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { id: subscriptionId }
        });
        if (!subscription) {
            throw new http_exception_1.HttpException(404, 'Subscription not found');
        }
        const nextRenewalDate = new Date();
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
        const updated = await prisma_1.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: 'ACTIVE',
                renewal_date: nextRenewalDate
            }
        });
        return {
            id: updated.id,
            status: updated.status,
            renewalDate: updated.renewal_date,
            message: 'Subscription renewed successfully'
        };
    }
    /**
     * Cancel subscription
     */
    static async cancelSubscription(subscriptionId) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { id: subscriptionId }
        });
        if (!subscription) {
            throw new http_exception_1.HttpException(404, 'Subscription not found');
        }
        const updated = await prisma_1.prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: 'CANCELLED' }
        });
        return {
            id: updated.id,
            status: updated.status,
            message: 'Subscription cancelled successfully'
        };
    }
    /**
     * Purchase addon service
     */
    static async purchaseAddonService(ownerType, ownerId, data) {
        if (data.amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Addon amount must be positive');
        }
        const account = await this.getOrCreateAccount(ownerType, ownerId);
        if (account.balance < data.amount) {
            throw new http_exception_1.HttpException(400, 'Insufficient balance for addon purchase');
        }
        const transaction = await prisma_1.prisma.virtualTransaction.create({
            data: {
                virtual_account_id: account.id,
                type: 'ADDON_SERVICE_CHARGE',
                amount: data.amount,
                balance_after: account.balance - data.amount,
                direction: 'DEBIT',
                status: 'COMPLETED',
                description: `${data.addonName} addon service${data.quantity ? ` (qty: ${data.quantity})` : ''}`,
                metadata: {
                    addonName: data.addonName,
                    quantity: data.quantity,
                    description: data.description
                }
            }
        });
        await prisma_1.prisma.virtualAccount.update({
            where: { id: account.id },
            data: {
                balance: { decrement: data.amount },
                total_debits: { increment: data.amount }
            }
        });
        return {
            id: transaction.id,
            addon: data.addonName,
            amount: data.amount,
            status: transaction.status,
            purchasedAt: transaction.created_at
        };
    }
    /**
     * Create Stripe checkout session
     */
    static async createStripeCheckoutSession(ownerType, ownerId, data) {
        if (data.amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Amount must be positive');
        }
        // TODO: Integrate with actual Stripe API
        return {
            sessionId: `session_${Date.now()}`,
            amount: data.amount,
            currency: 'USD',
            clientSecret: `secret_${Date.now()}`,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_',
            redirectUrl: `https://checkout.stripe.com/pay/${Date.now()}`
        };
    }
    /**
     * Admin: Get pending withdrawals
     */
    static async getPendingWithdrawals() {
        const withdrawals = await prisma_1.prisma.virtualTransaction.findMany({
            where: {
                type: 'COMMISSION_WITHDRAWAL',
                status: 'PENDING'
            },
            orderBy: { created_at: 'asc' }
        });
        return {
            withdrawals: withdrawals.map(w => ({
                id: w.id,
                amount: w.amount,
                ownerType: w.counterparty_type,
                ownerId: w.counterparty_id,
                requestedAt: w.created_at
            })),
            total: withdrawals.length
        };
    }
    /**
     * Admin: Approve withdrawal
     */
    static async approveWithdrawal(withdrawalId) {
        const withdrawal = await prisma_1.prisma.virtualTransaction.findUnique({
            where: { id: withdrawalId }
        });
        if (!withdrawal) {
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        }
        if (withdrawal.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, 'Only pending withdrawals can be approved');
        }
        const updated = await prisma_1.prisma.virtualTransaction.update({
            where: { id: withdrawalId },
            data: { status: 'COMPLETED' }
        });
        return {
            id: updated.id,
            status: updated.status,
            approvedAt: new Date().toISOString()
        };
    }
    /**
     * Admin: Reject withdrawal
     */
    static async rejectWithdrawal(withdrawalId, reason) {
        const withdrawal = await prisma_1.prisma.virtualTransaction.findUnique({
            where: { id: withdrawalId }
        });
        if (!withdrawal) {
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        }
        if (withdrawal.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, 'Only pending withdrawals can be rejected');
        }
        // Return funds to account
        await prisma_1.prisma.virtualAccount.update({
            where: { id: withdrawal.virtual_account_id },
            data: {
                balance: { increment: withdrawal.amount },
                total_credits: { increment: withdrawal.amount }
            }
        });
        const updated = await prisma_1.prisma.virtualTransaction.update({
            where: { id: withdrawalId },
            data: {
                status: 'FAILED',
                failed_reason: reason || 'Rejected: No reason provided'
            }
        });
        return {
            id: updated.id,
            status: updated.status,
            refundedAmount: withdrawal.amount,
            reason
        };
    }
    /**
     * Admin: Get wallet statistics
     */
    static async getWalletStats() {
        const [totalAccounts, activeAccounts, totalBalance, totalCredits, totalDebits] = await Promise.all([
            prisma_1.prisma.virtualAccount.count(),
            prisma_1.prisma.virtualAccount.count({ where: { status: 'ACTIVE' } }),
            prisma_1.prisma.virtualAccount.aggregate({ _sum: { balance: true } }),
            prisma_1.prisma.virtualAccount.aggregate({ _sum: { total_credits: true } }),
            prisma_1.prisma.virtualAccount.aggregate({ _sum: { total_debits: true } })
        ]);
        return {
            totalAccounts,
            activeAccounts,
            totalBalance: totalBalance._sum.balance || 0,
            totalCredits: totalCredits._sum.total_credits || 0,
            totalDebits: totalDebits._sum.total_debits || 0,
            currency: 'USD'
        };
    }
    /**
     * Admin: Get pending refund requests
     */
    static async getPendingRefunds() {
        const refunds = await prisma_1.prisma.virtualTransaction.findMany({
            where: {
                type: { in: ['SUBSCRIPTION_REFUND', 'JOB_REFUND', 'ADDON_SERVICE_REFUND'] },
                status: 'PENDING'
            },
            orderBy: { created_at: 'desc' }
        });
        return refunds.map(refund => ({
            id: refund.id,
            accountId: refund.virtual_account_id,
            ownerType: refund.counterparty_type,
            ownerId: refund.counterparty_id,
            amount: refund.amount,
            currency: 'USD',
            reason: refund.description,
            status: refund.status,
            createdAt: refund.created_at,
            referenceId: refund.reference_id
        }));
    }
    /**
     * Admin: Approve a refund request
     */
    static async approveRefund(refundId) {
        const refund = await prisma_1.prisma.virtualTransaction.findUnique({
            where: { id: refundId }
        });
        if (!refund) {
            throw new http_exception_1.HttpException(404, 'Refund request not found');
        }
        if (refund.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, 'Can only approve pending refund requests');
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            // Update refund transaction status
            const updatedRefund = await tx.virtualTransaction.update({
                where: { id: refundId },
                data: { status: 'COMPLETED' }
            });
            // Credit the account with the refund amount
            const updatedAccount = await tx.virtualAccount.update({
                where: { id: refund.virtual_account_id },
                data: {
                    balance: { increment: refund.amount },
                    total_credits: { increment: refund.amount }
                }
            });
            return { refund: updatedRefund, account: updatedAccount };
        });
        return {
            id: updated.refund.id,
            accountId: updated.refund.virtual_account_id,
            amount: updated.refund.amount,
            currency: 'USD',
            status: updated.refund.status,
            newBalance: updated.account.balance
        };
    }
    /**
     * Admin: Reject a refund request
     */
    static async rejectRefund(refundId, reason) {
        const refund = await prisma_1.prisma.virtualTransaction.findUnique({
            where: { id: refundId }
        });
        if (!refund) {
            throw new http_exception_1.HttpException(404, 'Refund request not found');
        }
        if (refund.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, 'Can only reject pending refund requests');
        }
        const updated = await prisma_1.prisma.virtualTransaction.update({
            where: { id: refundId },
            data: {
                status: 'FAILED',
                failed_reason: reason || refund.failed_reason
            }
        });
        return {
            id: updated.id,
            accountId: updated.virtual_account_id,
            amount: updated.amount,
            currency: 'USD',
            status: updated.status,
            rejectionReason: reason
        };
    }
}
exports.WalletService = WalletService;
