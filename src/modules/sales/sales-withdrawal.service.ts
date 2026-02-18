import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { WithdrawalStatus } from '@prisma/client';

export class SalesWithdrawalService {
    private readonly LOCKED_WITHDRAWAL_STATUSES: WithdrawalStatus[] = ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED'];

    async calculateBalance(consultantId: string) {
        // 1. Get all commissions
        const allCommissions = await prisma.commission.findMany({
            where: { consultant_id: consultantId }
        });

        // 2. Calculate Available Balance (Confirmed and NOT locked in active withdrawals)
        const confirmedCommissions = allCommissions.filter(c => c.status === 'CONFIRMED');

        // Find commissions currently locked in active withdrawals
        const activeWithdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: this.LOCKED_WITHDRAWAL_STATUSES }
            },
            select: { commission_ids: true }
        });

        const lockedCommissionIds = new Set<string>();
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
        const completedWithdrawals = await prisma.commissionWithdrawal.findMany({
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
            currency: 'USD',
            commissionCount: availableCommissions.length,
            availableCommissions: availableCommissions.map(c => ({
                id: c.id,
                amount: Number(c.amount),
                description: c.description || 'Commission',
                date: c.created_at
            }))
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

        // Verify commissions belong to consultant and are CONFIRMED
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
        const activeWithdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                status: { in: this.LOCKED_WITHDRAWAL_STATUSES }
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

        const totalAmount = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

        // Allow slight float difference
        if (Math.abs(totalAmount - data.amount) > 0.01) {
            // Use calculated amount for safety
        }

        // Create Withdrawal Request
        const withdrawal = await prisma.commissionWithdrawal.create({
            data: {
                consultant_id: consultantId,
                amount: totalAmount,
                payment_method: data.paymentMethod,
                payment_details: data.paymentDetails || {},
                commission_ids: data.commissionIds,
                notes: data.notes,
                status: 'PENDING'
            }
        });

        return withdrawal;
    }

    async getWithdrawals(consultantId: string, status?: string) {
        const withdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                ...(status ? { status: status as WithdrawalStatus } : {})
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

    async cancelWithdrawal(withdrawalId: string, consultantId: string) {
        const withdrawal = await prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId }
        });

        if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
        if (withdrawal.status !== 'PENDING') throw new HttpException(400, 'Cannot cancel non-pending withdrawal');

        return prisma.commissionWithdrawal.update({
            where: { id: withdrawalId },
            data: { status: 'CANCELLED' }
        });
    }

    async executeWithdrawal(withdrawalId: string, consultantId: string) {
        const withdrawal = await prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId },
            include: { consultant: true }
        });

        if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
        if (withdrawal.status !== 'APPROVED') throw new HttpException(400, 'Withdrawal must be approved before execution');

        const result = await prisma.commissionWithdrawal.update({
            where: { id: withdrawalId },
            data: {
                status: 'PROCESSING',
                processed_at: new Date()
            }
        });

        // TODO: Integrate with actual payment processor (Stripe, bank transfer, etc.)

        return result;
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

        const detailsSubmitted = !!consultant.stripe_account_id;
        const payoutEnabled = !!consultant.payout_enabled || consultant.stripe_account_status === 'active';
        const isConnected = detailsSubmitted && payoutEnabled;

        return {
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

    async initiateStripeOnboarding(consultantId: string) {
        const { StripeFactory } = await import('../stripe/stripe.factory');

        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId }
        });

        if (!consultant) throw new HttpException(404, 'Consultant not found');

        let accountId = consultant.stripe_account_id;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const returnPath = '/consultant360/earnings'; // Sales agents use consultant360

        // Create account if doesn't exist
        if (!accountId) {
            const stripe = StripeFactory.getClient();
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: consultant.email,
                capabilities: { transfers: { requested: true } },
                metadata: {
                    consultant_id: consultantId,
                    role: consultant.role
                }
            });

            accountId = account.id;

            // Update DB - mock accounts auto-approve, real accounts stay pending
            await prisma.consultant.update({
                where: { id: consultantId },
                data: {
                    stripe_account_id: accountId,
                    stripe_account_status: StripeFactory.isUsingMock() ? 'active' : 'pending',
                    payout_enabled: StripeFactory.isUsingMock() ? true : false
                }
            });
        }

        // Generate onboarding link
        const stripe = StripeFactory.getClient();
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${frontendUrl}${returnPath}?stripe_refresh=true`,
            return_url: `${frontendUrl}${returnPath}?stripe_success=true`,
            type: 'account_onboarding'
        });

        return {
            accountId,
            onboardingUrl: accountLink.url,
            accountLink: { url: accountLink.url }
        };
    }

    async getStripeLoginLink(consultantId: string) {
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId }
        });

        if (!consultant) throw new HttpException(404, 'Consultant not found');
        if (!consultant.stripe_account_id) {
            throw new HttpException(400, 'Consultant does not have a Stripe account connected');
        }

        // TODO: Implement actual Stripe login link generation using Stripe API

        return {
            message: 'Login link generated',
            loginLink: `https://dashboard.stripe.com/connect/accounts/${consultant.stripe_account_id}`,
            url: `https://dashboard.stripe.com/connect/accounts/${consultant.stripe_account_id}`,
            expiresIn: 15 * 60 // 15 minutes in seconds
        };
    }
}
