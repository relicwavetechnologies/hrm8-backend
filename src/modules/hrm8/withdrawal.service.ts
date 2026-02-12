import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { WithdrawalStatus } from '@prisma/client';

export class WithdrawalService extends BaseService {
    async getPendingWithdrawals() {
        // Fetch all withdrawals that are PENDING/PROCESSING/APPROVED?
        // Admin usually reviews PENDING ones.
        // Frontend WithdrawalsPage displays all statuses but filters/paginates?
        // The service call is 'getPendingWithdrawals', implying specific status.
        // But the previous implementation returned all? Let's check frontend.
        // Frontend uses `adminWithdrawalService.getPendingWithdrawals()`

        const withdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                // status: 'PENDING' // Should we restrict? Or return all? 
                // Let's return all for now so the table can sort/filter, 
                // or just PENDING if that's the intention.
                // Re-reading frontend: it shows 'Status' column with PENDING/APPROVED/etc.
                // So it probably expects ALL history or at least active ones.
                // However, the function name is `getPendingWithdrawals`. 
                // I'll return all for visibility but order by pending first.
            },
            include: {
                consultant: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // Map to frontend interface AdminWithdrawalRequest
        return withdrawals.map(w => ({
            id: w.id,
            consultantId: w.consultant_id,
            consultantName: `${w.consultant.first_name} ${w.consultant.last_name}`,
            consultantEmail: w.consultant.email,
            amount: w.amount,
            status: w.status,
            createdAt: w.created_at.toISOString(),
            paymentMethod: w.payment_method,
            paymentDetails: w.payment_details,
            notes: w.notes
        }));
    }

    async approveWithdrawal(id: string) {
        // Find
        const w = await prisma.commissionWithdrawal.findUnique({ where: { id } });
        if (!w) throw new HttpException(404, 'Withdrawal not found');
        if (w.status !== 'PENDING') throw new HttpException(400, 'Only pending withdrawals can be approved');

        // Update
        return prisma.commissionWithdrawal.update({
            where: { id },
            data: { status: 'APPROVED' } // Ready for payment processing
        });
    }

    async rejectWithdrawal(id: string) {
        const w = await prisma.commissionWithdrawal.findUnique({ where: { id } });
        if (!w) throw new HttpException(404, 'Withdrawal not found');
        if (w.status !== 'PENDING') throw new HttpException(400, 'Only pending withdrawals can be rejected');

        return prisma.commissionWithdrawal.update({
            where: { id },
            data: { status: 'REJECTED' } // Money returns to balance? 
            // In consultant-withdrawal.service.ts, calculateBalance filters out active withdrawals.
            // REJECTED is not in ['PENDING', 'APPROVED', 'PROCESSING'], so it naturally releases the lock.
        });
    }

    async processPayment(id: string, notes?: string) {
        const w = await prisma.commissionWithdrawal.findUnique({ where: { id } });
        if (!w) throw new HttpException(404, 'Withdrawal not found');
        if (w.status !== 'APPROVED' && w.status !== 'PROCESSING') {
            throw new HttpException(400, 'Withdrawal must be approved first');
        }

        // If APPROVED, debit wallet (admin processing manually). If PROCESSING, consultant already debited via executeWithdrawal.
        const needsDebit = w.status === 'APPROVED';

        return prisma.$transaction(async (tx) => {
            if (needsDebit) {
                const account = await tx.virtualAccount.findFirst({
                    where: { owner_type: 'CONSULTANT', owner_id: w.consultant_id }
                });
                if (account) {
                    const balanceAfter = Number(account.balance) - w.amount;
                    await tx.virtualTransaction.create({
                        data: {
                            virtual_account_id: account.id,
                            type: 'COMMISSION_WITHDRAWAL',
                            amount: w.amount,
                            balance_after: balanceAfter,
                            direction: 'DEBIT',
                            status: 'COMPLETED',
                            description: 'Withdrawal processed',
                            reference_id: w.id,
                            reference_type: 'COMMISSION_WITHDRAWAL'
                        }
                    });
                    await tx.virtualAccount.update({
                        where: { id: account.id },
                        data: { balance: { decrement: w.amount }, total_debits: { increment: w.amount } }
                    });
                }
            }

            return tx.commissionWithdrawal.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    processed_at: new Date(),
                    notes: notes ? `${w.notes || ''}\n${notes}` : w.notes
                }
            });
        });
    }
}
