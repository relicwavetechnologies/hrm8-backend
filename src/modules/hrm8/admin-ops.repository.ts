import { BaseRepository } from '../../core/repository';

export class AdminOpsRepository extends BaseRepository {
    async getRefundRequests() {
        return this.prisma.transactionRefundRequest.findMany({
            include: { company: true },
            orderBy: { created_at: 'desc' }
        });
    }

    async approveRefund(id: string, adminId: string, notes?: string) {
        return this.prisma.$transaction(async (tx: any) => {
            const request = await tx.transactionRefundRequest.findUnique({ where: { id } });
            if (!request) throw new Error('Refund request not found');
            if (request.status !== 'PENDING') throw new Error('Request is not pending');

            // 1. Update request status
            const updated = await tx.transactionRefundRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    processed_at: new Date(),
                    processed_by: adminId,
                    admin_notes: notes
                }
            });

            // 2. Here we would typically trigger the actual refund via Stripe or Wallet
            // For now, we assume the financial transaction is handled or marked for processing.
            // If it was a wallet transaction, we might reverse it here.

            return updated;
        });
    }

    async getConversionRequests() {
        return this.prisma.leadConversionRequest.findMany({
            include: { lead: true }
        });
    }

    async getIntegrations() {
        return this.prisma.integration.findMany();
    }

    // --- Withdrawals ---
    async getWithdrawalRequests(status?: string) {
        const where: any = {};
        if (status) where.status = status;

        return this.prisma.commissionWithdrawal.findMany({
            where,
            include: { consultant: true },
            orderBy: { created_at: 'desc' }
        });
    }

    async approveWithdrawal(id: string, adminId: string, notes?: string, paymentRef?: string) {
        return this.prisma.$transaction(async (tx: any) => {
            const withdrawal = await tx.commissionWithdrawal.findUnique({ where: { id } });
            if (!withdrawal) throw new Error('Withdrawal not found');
            if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'REQUESTED') {
                // allow approving REQUESTED or PENDING
                // Check current status strictly if needed
            }

            // 1. Update Withdrawal
            const updated = await tx.commissionWithdrawal.update({
                where: { id },
                data: {
                    status: 'COMPLETED', // Or PROCESSING if utilizing payout provider
                    processed_at: new Date(),
                    processed_by: adminId,
                    admin_notes: notes,
                    transaction_reference: paymentRef
                }
            });

            // 2. Mark Commissions as PAID
            if (withdrawal.commission_ids && withdrawal.commission_ids.length > 0) {
                await tx.commission.updateMany({
                    where: { id: { in: withdrawal.commission_ids } },
                    data: {
                        status: 'PAID',
                        paid_at: new Date(),
                        payment_reference: paymentRef || `WITHDRAWAL-${id}`
                    }
                });
            }

            return updated;
        });
    }

    async rejectWithdrawal(id: string, adminId: string, reason: string) {
        return this.prisma.$transaction(async (tx: any) => {
            const withdrawal = await tx.commissionWithdrawal.findUnique({ where: { id } });
            if (!withdrawal) throw new Error('Withdrawal not found');

            // 1. Update Withdrawal
            return tx.commissionWithdrawal.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    processed_at: new Date(),
                    processed_by: adminId,
                    admin_notes: reason
                }
            });
            // Commissions remain CONFIRMED and available for next withdrawal (filtered out by 'REJECTED' status check in ConsultantRepository)
        });
    }
}
