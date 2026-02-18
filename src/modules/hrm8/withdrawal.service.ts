import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';

export class WithdrawalService extends BaseService {
    private async getScopedWithdrawal(id: string, allowedRegionIds?: string[]) {
        const withdrawal = await prisma.commissionWithdrawal.findUnique({
            where: { id },
            include: {
                consultant: {
                    select: {
                        region_id: true
                    }
                }
            }
        });

        if (!withdrawal) {
            throw new HttpException(404, 'Withdrawal not found');
        }

        if (allowedRegionIds && !allowedRegionIds.includes(withdrawal.consultant.region_id)) {
            throw new HttpException(403, 'Access denied for this region');
        }

        return withdrawal;
    }

    async getPendingWithdrawals(allowedRegionIds?: string[]) {
        if (allowedRegionIds && allowedRegionIds.length === 0) {
            return [];
        }

        // Fetch all withdrawals that are PENDING/PROCESSING/APPROVED?
        // Admin usually reviews PENDING ones.
        // Frontend WithdrawalsPage displays all statuses but filters/paginates?
        // The service call is 'getPendingWithdrawals', implying specific status.
        // But the previous implementation returned all? Let's check frontend.
        // Frontend uses `adminWithdrawalService.getPendingWithdrawals()`

        const withdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                ...(allowedRegionIds ? {
                    consultant: {
                        region_id: { in: allowedRegionIds }
                    }
                } : {}),
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

    async approveWithdrawal(id: string, allowedRegionIds?: string[], adminId?: string) {
        // Find
        const w = await this.getScopedWithdrawal(id, allowedRegionIds);
        if (w.status !== 'PENDING') throw new HttpException(400, 'Only pending withdrawals can be approved');

        // Update
        return prisma.commissionWithdrawal.update({
            where: { id },
            data: {
                status: 'APPROVED',
                processed_by: adminId || w.processed_by
            } // Ready for payment processing
        });
    }

    async rejectWithdrawal(id: string, allowedRegionIds?: string[], adminId?: string, reason?: string) {
        const w = await this.getScopedWithdrawal(id, allowedRegionIds);
        if (w.status !== 'PENDING') throw new HttpException(400, 'Only pending withdrawals can be rejected');

        return prisma.commissionWithdrawal.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejected_by: adminId || w.rejected_by,
                rejected_at: new Date(),
                rejection_reason: reason || w.rejection_reason
            } // Money returns to balance? 
            // In consultant-withdrawal.service.ts, calculateBalance filters out active withdrawals.
            // REJECTED is not in ['PENDING', 'APPROVED', 'PROCESSING'], so it naturally releases the lock.
        });
    }

    async processPayment(id: string, notes?: string, allowedRegionIds?: string[], adminId?: string) {
        const w = await this.getScopedWithdrawal(id, allowedRegionIds);
        if (w.status !== 'APPROVED' && w.status !== 'PROCESSING') {
            throw new HttpException(400, 'Withdrawal must be approved first');
        }

        return prisma.$transaction(async (tx) => {
            const latest = await tx.commissionWithdrawal.findUnique({
                where: { id: w.id }
            });

            if (!latest) {
                throw new HttpException(404, 'Withdrawal not found');
            }

            if (latest.status !== 'APPROVED' && latest.status !== 'PROCESSING' && latest.status !== 'COMPLETED') {
                throw new HttpException(400, 'Withdrawal is no longer payable');
            }

            if (latest.status === 'COMPLETED') {
                return latest;
            }

            let debitTransaction = await tx.virtualTransaction.findFirst({
                where: {
                    reference_type: 'COMMISSION_WITHDRAWAL',
                    reference_id: latest.id,
                    direction: 'DEBIT',
                    status: 'COMPLETED'
                },
                orderBy: { created_at: 'asc' }
            });

            if (!latest.debited_from_wallet && !debitTransaction) {
                const account = await tx.virtualAccount.findUnique({
                    where: {
                        owner_type_owner_id: {
                            owner_type: 'CONSULTANT',
                            owner_id: latest.consultant_id
                        }
                    }
                });
                if (!account) {
                    throw new HttpException(404, 'Consultant wallet account not found');
                }
                if (Number(account.balance) < latest.amount) {
                    throw new HttpException(400, 'Insufficient wallet balance for withdrawal debit');
                }

                debitTransaction = await tx.virtualTransaction.create({
                    data: {
                        virtual_account_id: account.id,
                        type: 'COMMISSION_WITHDRAWAL',
                        amount: latest.amount,
                        balance_after: Number(account.balance) - latest.amount,
                        direction: 'DEBIT',
                        status: 'COMPLETED',
                        description: 'Withdrawal processed',
                        reference_id: latest.id,
                        reference_type: 'COMMISSION_WITHDRAWAL',
                        withdrawal_request_id: latest.id
                    }
                });

                await tx.virtualAccount.update({
                    where: { id: account.id },
                    data: { balance: { decrement: latest.amount }, total_debits: { increment: latest.amount } }
                });
            }

            if (!debitTransaction && latest.virtual_transaction_id) {
                debitTransaction = await tx.virtualTransaction.findUnique({
                    where: { id: latest.virtual_transaction_id }
                });
            }

            if (!debitTransaction && !latest.debited_from_wallet) {
                throw new HttpException(500, 'Withdrawal debit transaction was not created');
            }

            return tx.commissionWithdrawal.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    processed_at: new Date(),
                    processed_by: adminId || w.processed_by,
                    notes: notes ? `${latest.notes || ''}\n${notes}` : latest.notes,
                    debited_from_wallet: true,
                    virtual_transaction_id: latest.virtual_transaction_id || debitTransaction?.id,
                    wallet_debit_at: latest.wallet_debit_at || debitTransaction?.created_at || new Date()
                }
            });
        });
    }
}
