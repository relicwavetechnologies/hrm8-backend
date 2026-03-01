"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesWithdrawalService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const commission_payout_service_1 = require("../payouts/commission-payout.service");
const airwallex_fx_service_1 = require("../airwallex/airwallex-fx.service");
class SalesWithdrawalService {
    constructor() {
        this.LOCKED_WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED'];
    }
    async resolveConsultantCurrency(consultantId) {
        const account = await prisma_1.prisma.virtualAccount.findUnique({
            where: {
                owner_type_owner_id: {
                    owner_type: 'CONSULTANT',
                    owner_id: consultantId
                }
            },
            select: { id: true }
        });
        if (account) {
            const latestTxCurrency = await prisma_1.prisma.virtualTransaction.findFirst({
                where: {
                    virtual_account_id: account.id,
                    billing_currency_used: { not: null }
                },
                orderBy: { created_at: 'desc' },
                select: { billing_currency_used: true }
            });
            if (latestTxCurrency?.billing_currency_used) {
                return latestTxCurrency.billing_currency_used;
            }
        }
        const latestCommissionCurrency = await prisma_1.prisma.commission.findFirst({
            where: { consultant_id: consultantId },
            orderBy: { created_at: 'desc' },
            select: {
                subscription: { select: { currency: true } },
                job: { select: { payment_currency: true } }
            }
        });
        return latestCommissionCurrency?.subscription?.currency
            || latestCommissionCurrency?.job?.payment_currency
            || 'USD';
    }
    async calculateBalance(consultantId) {
        // 1. Get all commissions
        const allCommissions = await prisma_1.prisma.commission.findMany({
            where: { consultant_id: consultantId }
        });
        // 2. Calculate Available Balance (Confirmed and NOT locked in active withdrawals)
        const confirmedCommissions = allCommissions.filter(c => c.status === 'CONFIRMED');
        // Find commissions currently locked in active withdrawals
        const activeWithdrawals = await prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: this.LOCKED_WITHDRAWAL_STATUSES }
            },
            select: { commission_ids: true }
        });
        const lockedCommissionIds = new Set();
        activeWithdrawals.forEach(w => {
            w.commission_ids.forEach(id => lockedCommissionIds.add(id));
        });
        const availableCommissions = confirmedCommissions.filter(c => !lockedCommissionIds.has(c.id));
        const balance = availableCommissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        // 3. Calculate Pending (Status = PENDING or CONFIRMED but locked?) 
        // Typically Pending means status='PENDING'. Confirmed means ready for withdrawal.
        const pendingCommissions = allCommissions.filter(c => c.status === 'PENDING');
        const pendingBalance = pendingCommissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        // 4. Calculate Total Earned (All time commissions excluding Cancelled)
        const totalEarned = allCommissions
            .filter(c => c.status !== 'CANCELLED')
            .reduce((sum, c) => sum + Number(c.amount || 0), 0);
        // 5. Calculate Total Withdrawn
        // Sum of COMPLETED withdrawals
        const completedWithdrawals = await prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: 'COMPLETED'
            }
        });
        const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
        return {
            availableBalance: balance,
            pendingBalance: pendingBalance,
            totalEarned,
            totalWithdrawn,
            currency: await this.resolveConsultantCurrency(consultantId),
            commissionCount: availableCommissions.length,
            availableCommissions: availableCommissions.map(c => ({
                id: c.id,
                amount: Number(c.amount),
                description: c.description || 'Commission',
                date: c.created_at
            }))
        };
    }
    async requestWithdrawal(consultantId, data) {
        if (data.amount <= 0)
            throw new http_exception_1.HttpException(400, 'Invalid amount');
        // Verify commissions belong to consultant and are CONFIRMED
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
        const activeWithdrawals = await prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: this.LOCKED_WITHDRAWAL_STATUSES }
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
        const totalAmount = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        if (Math.abs(totalAmount - data.amount) > 0.01) {
            throw new http_exception_1.HttpException(400, `Amount mismatch: selected commissions total ${totalAmount}, requested ${data.amount}`);
        }
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { payout_currency: true }
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
        return withdrawal;
    }
    async getWithdrawals(consultantId, status) {
        const withdrawals = await prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                ...(status ? { status: status } : {})
            },
            orderBy: { created_at: 'desc' }
        });
        // Map to camelCase for frontend
        return withdrawals.map(w => ({
            id: w.id,
            amount: Number(w.amount),
            status: w.status,
            paymentMethod: w.payment_method,
            createdAt: w.created_at,
            processedAt: w.processed_at,
            notes: w.notes
        }));
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
        const detailsSubmitted = !!consultant.stripe_account_id;
        const payoutEnabled = !!consultant.payout_enabled || consultant.stripe_account_status === 'active';
        const isConnected = detailsSubmitted && payoutEnabled;
        return {
            provider: 'AIRWALLEX',
            payoutEnabled,
            detailsSubmitted,
            isConnected,
            stripeAccountId: consultant.stripe_account_id,
            accountStatus: consultant.stripe_account_status,
            onboardedAt: consultant.stripe_onboarded_at,
            email: consultant.email,
            lastUpdated: consultant.updated_at
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
        const returnPath = '/consultant360/earnings'; // Sales agents use consultant360
        // Create account if doesn't exist
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
        const url = `https://www.airwallex.com/app/login?beneficiary=${consultant.stripe_account_id}`;
        return {
            provider: 'AIRWALLEX',
            message: 'Login link generated',
            loginLink: url,
            url,
            expiresIn: 15 * 60 // 15 minutes in seconds
        };
    }
}
exports.SalesWithdrawalService = SalesWithdrawalService;
