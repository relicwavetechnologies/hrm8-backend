"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantWithdrawalService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const commission_payout_service_1 = require("../payouts/commission-payout.service");
const airwallex_fx_service_1 = require("../airwallex/airwallex-fx.service");
class ConsultantWithdrawalService {
    /**
     * Unified balance using VirtualAccount as single source of truth (aligns with Consultant360).
     */
    async calculateBalance(consultantId) {
        const account = await prisma_1.prisma.virtualAccount.findUnique({
            where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
        });
        const availableBalance = account ? Number(account.balance) : 0;
        const totalCredits = account ? Number(account.total_credits || 0) : 0;
        const totalDebits = account ? Number(account.total_debits || 0) : 0;
        const allCommissions = await prisma_1.prisma.commission.findMany({
            where: { consultant_id: consultantId, status: { not: 'CANCELLED' } }
        });
        const activeWithdrawals = await prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
            },
            select: { commission_ids: true }
        });
        const lockedCommissionIds = new Set();
        activeWithdrawals.forEach(w => w.commission_ids.forEach(id => lockedCommissionIds.add(id)));
        const availableCommissionsList = [];
        let pendingBalance = 0;
        let totalEarned = 0;
        allCommissions.forEach(c => {
            const amount = Number(c.amount) || 0;
            totalEarned += amount;
            if (c.status === 'CONFIRMED' && !lockedCommissionIds.has(c.id)) {
                availableCommissionsList.push({
                    id: c.id,
                    amount,
                    description: c.description || 'Commission payment',
                    createdAt: c.created_at
                });
            }
            else if (c.status === 'PENDING') {
                pendingBalance += amount;
            }
        });
        const completedSum = await prisma_1.prisma.commissionWithdrawal.aggregate({
            where: { consultant_id: consultantId, status: 'COMPLETED' },
            _sum: { amount: true }
        });
        const totalWithdrawn = completedSum._sum.amount || 0;
        return {
            availableBalance,
            pendingBalance,
            totalEarned,
            totalWithdrawn,
            availableCommissions: availableCommissionsList
        };
    }
    async requestWithdrawal(consultantId, data) {
        if (data.amount <= 0)
            throw new http_exception_1.HttpException(400, 'Invalid amount');
        const account = await prisma_1.prisma.virtualAccount.findUnique({
            where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
        });
        const balance = account ? Number(account.balance) : 0;
        if (balance < data.amount)
            throw new http_exception_1.HttpException(400, 'Insufficient balance for withdrawal');
        const commissions = await prisma_1.prisma.commission.findMany({
            where: {
                id: { in: data.commissionIds },
                consultant_id: consultantId,
                status: 'CONFIRMED'
            }
        });
        if (commissions.length !== data.commissionIds.length) {
            throw new http_exception_1.HttpException(400, 'One or more commissions are invalid or not eligible for withdrawal');
        }
        // Check if any correspond to active withdrawals
        // (Re-using logic from calculateBalance for safety)
        const activeWithdrawals = await prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
            },
            select: { commission_ids: true }
        });
        const lockedCommissionIds = new Set();
        activeWithdrawals.forEach(w => {
            w.commission_ids.forEach(id => lockedCommissionIds.add(id));
        });
        if (data.commissionIds.some(id => lockedCommissionIds.has(id))) {
            throw new http_exception_1.HttpException(400, 'One or more commissions are already in an active withdrawal request');
        }
        const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0);
        if (Math.abs(totalAmount - data.amount) > 0.01) {
            throw new http_exception_1.HttpException(400, `Amount mismatch: selected commissions total ${totalAmount}, requested ${data.amount}`);
        }
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { payout_currency: true, region_id: true }
        });
        const payoutCurrency = consultant?.payout_currency || 'USD';
        const sourceCurrencies = [...new Set(commissions.map(c => c.currency || 'USD'))];
        const primarySourceCurrency = sourceCurrencies[0] || 'USD';
        const fxQuote = await airwallex_fx_service_1.AirwallexFxService.getQuote(primarySourceCurrency, payoutCurrency);
        const { payoutAmount, fxRate } = airwallex_fx_service_1.AirwallexFxService.resolveFxFields(primarySourceCurrency, payoutCurrency, totalAmount, fxQuote);
        const withdrawal = await prisma_1.prisma.commissionWithdrawal.create({
            data: {
                consultant_id: consultantId,
                amount: totalAmount,
                currency: primarySourceCurrency,
                payout_currency: payoutCurrency,
                payout_amount: payoutAmount,
                fx_rate_used: fxRate,
                payment_method: data.paymentMethod,
                payment_details: data.paymentDetails || {},
                commission_ids: data.commissionIds,
                notes: data.notes,
                status: 'PENDING'
            }
        });
        // We DO NOT update Commission status to PROCESSING because it doesn't exist.
        // We rely on the `activeWithdrawals` check above to prevent double withdrawal.
        return withdrawal;
    }
    async getWithdrawals(consultantId, status) {
        return prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                ...(status ? { status: status } : {})
            },
            orderBy: { created_at: 'desc' }
        });
    }
    async cancelWithdrawal(withdrawalId, consultantId) {
        const withdrawal = await prisma_1.prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId }
        });
        if (!withdrawal)
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        if (withdrawal.status !== 'PENDING')
            throw new http_exception_1.HttpException(400, 'Cannot cancel non-pending withdrawal');
        // No need to revert Commission status since we didn't change it.
        // Just cancel the withdrawal.
        return prisma_1.prisma.commissionWithdrawal.update({
            where: { id: withdrawalId },
            data: { status: 'CANCELLED' }
        });
    }
    async executeWithdrawal(withdrawalId, consultantId) {
        const withdrawal = await prisma_1.prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId }
        });
        if (!withdrawal)
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
            throw new http_exception_1.HttpException(400, 'Withdrawal must be approved before execution');
        }
        return commission_payout_service_1.CommissionPayoutService.executeWithdrawalPayout(withdrawalId);
    }
    async getStripeStatus(consultantId) {
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: {
                id: true,
                email: true,
                stripe_account_id: true,
                stripe_account_status: true,
                payout_enabled: true,
                stripe_onboarded_at: true,
                updated_at: true
            }
        });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const payoutsEnabled = !!consultant.payout_enabled || consultant.stripe_account_status === 'active';
        return {
            provider: 'AIRWALLEX',
            isConnected: !!consultant.stripe_account_id && payoutsEnabled,
            stripeAccountId: consultant.stripe_account_id,
            accountStatus: consultant.stripe_account_status,
            onboardedAt: consultant.stripe_onboarded_at,
            email: consultant.email,
            lastUpdated: consultant.updated_at,
            payoutEnabled: payoutsEnabled,
            detailsSubmitted: !!consultant.stripe_account_id,
        };
    }
    async initiateStripeOnboarding(consultantId) {
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId }
        });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        let accountId = consultant.stripe_account_id;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const returnPath = '/consultant/earnings';
        // Create payout beneficiary if missing.
        if (!accountId) {
            accountId = `awx_benef_${consultantId.replace(/-/g, '').slice(0, 20)}`;
            await prisma_1.prisma.consultant.update({
                where: { id: consultantId },
                data: {
                    stripe_account_id: accountId,
                    stripe_account_status: 'active',
                    payout_enabled: true,
                    stripe_onboarded_at: new Date()
                }
            });
        }
        const onboardingUrl = `${frontendUrl}${returnPath}?airwallex_success=true`;
        return {
            provider: 'AIRWALLEX',
            accountId,
            onboardingUrl,
            accountLink: { url: onboardingUrl }
        };
    }
    async getStripeLoginLink(consultantId) {
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId }
        });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        if (!consultant.stripe_account_id) {
            throw new http_exception_1.HttpException(400, 'Consultant does not have an Airwallex beneficiary connected');
        }
        const loginLink = `https://www.airwallex.com/app/login?beneficiary=${consultant.stripe_account_id}`;
        return {
            provider: 'AIRWALLEX',
            message: 'Login link generated',
            loginLink,
            url: loginLink,
            expiresIn: 15 * 60 // 15 minutes in seconds
        };
    }
}
exports.ConsultantWithdrawalService = ConsultantWithdrawalService;
