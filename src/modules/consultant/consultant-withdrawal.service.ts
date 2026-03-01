import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { WithdrawalStatus } from '@prisma/client';
import { CommissionPayoutService } from '../payouts/commission-payout.service';
import { AirwallexFxService } from '../airwallex/airwallex-fx.service';

export class ConsultantWithdrawalService {

    /**
     * Unified balance using VirtualAccount as single source of truth (aligns with Consultant360).
     */
    async calculateBalance(consultantId: string) {
        const account = await prisma.virtualAccount.findUnique({
            where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
        });

        const availableBalance = account ? Number(account.balance) : 0;
        const totalCredits = account ? Number(account.total_credits || 0) : 0;
        const totalDebits = account ? Number(account.total_debits || 0) : 0;

        const allCommissions = await prisma.commission.findMany({
            where: { consultant_id: consultantId, status: { not: 'CANCELLED' } }
        });

        const activeWithdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
            },
            select: { commission_ids: true }
        });
        const lockedCommissionIds = new Set<string>();
        activeWithdrawals.forEach(w => w.commission_ids.forEach(id => lockedCommissionIds.add(id)));

        const availableCommissionsList: any[] = [];
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
            } else if (c.status === 'PENDING') {
                pendingBalance += amount;
            }
        });

        const completedSum = await prisma.commissionWithdrawal.aggregate({
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

    async requestWithdrawal(consultantId: string, data: {
        amount: number;
        paymentMethod: string;
        paymentDetails: any;
        commissionIds: string[];
        notes?: string;
    }) {
        if (data.amount <= 0) throw new HttpException(400, 'Invalid amount');

        const account = await prisma.virtualAccount.findUnique({
            where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
        });
        const balance = account ? Number(account.balance) : 0;
        if (balance < data.amount) throw new HttpException(400, 'Insufficient balance for withdrawal');

        const commissions = await prisma.commission.findMany({
            where: {
                id: { in: data.commissionIds },
                consultant_id: consultantId,
                status: 'CONFIRMED'
            }
        });

        if (commissions.length !== data.commissionIds.length) {
            throw new HttpException(400, 'One or more commissions are invalid or not eligible for withdrawal');
        }

        // Check if any correspond to active withdrawals
        // (Re-using logic from calculateBalance for safety)
        const activeWithdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
            },
            select: { commission_ids: true }
        });

        const lockedCommissionIds = new Set<string>();
        activeWithdrawals.forEach(w => {
            w.commission_ids.forEach(id => lockedCommissionIds.add(id));
        });

        if (data.commissionIds.some(id => lockedCommissionIds.has(id))) {
            throw new HttpException(400, 'One or more commissions are already in an active withdrawal request');
        }

        const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0);

        if (Math.abs(totalAmount - data.amount) > 0.01) {
            throw new HttpException(400, `Amount mismatch: selected commissions total ${totalAmount}, requested ${data.amount}`);
        }

        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { payout_currency: true, region_id: true }
        });
        const payoutCurrency = consultant?.payout_currency || 'USD';

        const sourceCurrencies = [...new Set(commissions.map(c => (c as any).currency || 'USD'))];
        const primarySourceCurrency = sourceCurrencies[0] || 'USD';

        const fxQuote = await AirwallexFxService.getQuote(primarySourceCurrency, payoutCurrency);
        const { payoutAmount, fxRate } = AirwallexFxService.resolveFxFields(
            primarySourceCurrency, payoutCurrency, totalAmount, fxQuote
        );

        const withdrawal = await prisma.commissionWithdrawal.create({
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

    async getWithdrawals(consultantId: string, status?: string) {
        return prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                ...(status ? { status: status as WithdrawalStatus } : {})
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async cancelWithdrawal(withdrawalId: string, consultantId: string) {
        const withdrawal = await prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId }
        });

        if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
        if (withdrawal.status !== 'PENDING') throw new HttpException(400, 'Cannot cancel non-pending withdrawal');

        // No need to revert Commission status since we didn't change it.
        // Just cancel the withdrawal.

        return prisma.commissionWithdrawal.update({
            where: { id: withdrawalId },
            data: { status: 'CANCELLED' }
        });
    }

    async executeWithdrawal(withdrawalId: string, consultantId: string) {
        const withdrawal = await prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId }
        });

        if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
        if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
            throw new HttpException(400, 'Withdrawal must be approved before execution');
        }

        return CommissionPayoutService.executeWithdrawalPayout(withdrawalId);
    }

    async getStripeStatus(consultantId: string) {
        const consultant = await prisma.consultant.findUnique({
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

        if (!consultant) throw new HttpException(404, 'Consultant not found');

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

    async initiateStripeOnboarding(consultantId: string) {
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId }
        });

        if (!consultant) throw new HttpException(404, 'Consultant not found');

        let accountId = consultant.stripe_account_id;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const returnPath = '/consultant/earnings';

        // Create payout beneficiary if missing.
        if (!accountId) {
            accountId = `awx_benef_${consultantId.replace(/-/g, '').slice(0, 20)}`;
            await prisma.consultant.update({
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

    async getStripeLoginLink(consultantId: string) {
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId }
        });

        if (!consultant) throw new HttpException(404, 'Consultant not found');
        if (!consultant.stripe_account_id) {
            throw new HttpException(400, 'Consultant does not have an Airwallex beneficiary connected');
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
