import { BaseService } from '../../core/service';
import { CommissionRepository } from './commission.repository';
import { WalletService } from '../wallet/wallet.service';
import { VirtualTransactionType, CommissionStatus, WithdrawalStatus, CommissionType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';

export interface AwardCommissionInput {
    consultantId: string;
    jobId?: string;
    subscriptionId?: string;
    type: CommissionType;
    amount?: number;  // Optional - can be calculated from job/subscription
    rate?: number;
    description?: string;
    expiryDate?: Date;
    calculateFromJob?: boolean;  // If true, calculate from job's actual payment
}

export interface RequestCommissionInput {
    consultantId: string;
    type: CommissionType;
    amount?: number;
    jobId?: string;
    subscriptionId?: string;
    description?: string;
    calculateFromJob?: boolean;
    rate?: number;
}

export interface RequestWithdrawalInput {
    consultantId: string;
    amount: number;
    paymentMethod: string;
    paymentDetails: Record<string, any>;
    notes?: string;
}

export interface ApproveWithdrawalInput {
    withdrawalId: string;
    adminId: string;
    paymentReference?: string;
    adminNotes?: string;
}

export class CommissionService extends BaseService {
    constructor(private commissionRepository: CommissionRepository) {
        super();
    }

    private mapToDTO(commission: any) {
        return {
            id: commission.id,
            consultantId: commission.consultant_id,
            regionId: commission.region_id,
            jobId: commission.job_id,
            subscriptionId: commission.subscription_id,
            type: commission.type,
            amount: commission.amount,
            description: commission.description,
            status: commission.status,
            createdAt: commission.created_at,
            confirmedAt: commission.confirmed_at,
            paidAt: commission.paid_at,
            consultant: commission.consultant ? {
                id: commission.consultant.id,
                firstName: commission.consultant.first_name,
                lastName: commission.consultant.last_name,
                email: commission.consultant.email
            } : undefined
        };
    }

    async getAll(params: {
        limit?: number;
        offset?: number;
        consultantId?: string;
        regionId?: string;
        status?: string;
        commissionType?: string;
        allowedRegionIds?: string[];
    }) {
        const { limit = 50, offset = 0, consultantId, regionId, status, commissionType, allowedRegionIds } = params;
        if (allowedRegionIds && allowedRegionIds.length === 0) {
            return { commissions: [], total: 0 };
        }

        const where: any = {};
        if (consultantId) where.consultant_id = consultantId;
        if (regionId) where.region_id = regionId;
        if (status) where.status = status;
        if (commissionType) where.type = commissionType;
        if (allowedRegionIds) {
            if (where.region_id) {
                if (!allowedRegionIds.includes(where.region_id)) {
                    return { commissions: [], total: 0 };
                }
            } else {
                where.region_id = { in: allowedRegionIds };
            }
        }

        const [commissions, total] = await Promise.all([
            this.commissionRepository.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: { consultant: true }
            }),
            this.commissionRepository.count(where),
        ]);

        return { commissions: commissions.map(c => this.mapToDTO(c)), total };
    }

    async getById(id: string, allowedRegionIds?: string[]) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission) throw new HttpException(404, 'Commission not found');
        if (allowedRegionIds && !allowedRegionIds.includes(commission.region_id)) {
            throw new HttpException(403, 'Access denied for this region');
        }
        return this.mapToDTO(commission);
    }

    /**
     * Award commission based on regional pricing
     * Calculates commission from job/subscription payment amount
     */
    async awardCommissionForPayment(
        consultantId: string,
        type: CommissionType,
        jobId?: string,
        subscriptionId?: string,
        customRate?: number
    ) {
        return this.create({
            consultantId,
            type,
            jobId,
            subscriptionId,
            calculateFromJob: true,
            rate: customRate,
        });
    }

    async create(input: AwardCommissionInput) {
        const {
            consultantId,
            amount: providedAmount,
            type,
            jobId,
            subscriptionId,
            description,
            rate,
            calculateFromJob = false
        } = input;

        // Calculate amount if needed
        let amount = providedAmount;
        let commissionCurrency = 'USD';
        let commissionRate = rate;

        if (calculateFromJob && (jobId || subscriptionId)) {
            // Fetch payment details to calculate commission
            if (jobId) {
                const job = await prisma.job.findUnique({
                    where: { id: jobId },
                    select: { payment_amount: true, payment_currency: true }
                });
                if (job && job.payment_amount) {
                    const consultant = await prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate || consultant?.default_commission_rate || 0.20;
                    amount = job.payment_amount * commissionRate;
                    commissionCurrency = job.payment_currency || 'USD';
                }
            } else if (subscriptionId) {
                const subscription = await prisma.subscription.findUnique({
                    where: { id: subscriptionId },
                    select: { base_price: true, currency: true }
                });
                if (subscription && subscription.base_price) {
                    const consultant = await prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate || consultant?.default_commission_rate || 0.20;
                    amount = subscription.base_price * commissionRate;
                    commissionCurrency = subscription.currency || 'USD';
                }
            }
        }

        if (!amount || amount <= 0) throw new HttpException(400, 'Commission amount must be positive');

        return this.commissionRepository.transaction(async (tx) => {
            // Need to fetch consultant for region_id. Using global prisma for now inside tx context if possible or assume tx has access
            // Ideally Repository should expose method that accepts tx. 
            // For simplicity adapting logic:
            const consultant = await tx.consultant.findUnique({
                where: { id: consultantId },
                select: { region_id: true, email: true },
            });

            if (!consultant) throw new HttpException(404, 'Consultant not found');

            const commission = await tx.commission.create({
                data: {
                    consultant_id: consultantId,
                    region_id: consultant.region_id,
                    job_id: jobId,
                    subscription_id: subscriptionId,
                    type,
                    amount,
                    description: description || `Commission for ${type}`,
                    status: CommissionStatus.CONFIRMED,
                    confirmed_at: new Date(),
                },
            });

            // Wallet interaction
            const account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });

            let accountId = account?.id;
            if (!accountId) {
                const newAccount = await tx.virtualAccount.create({
                    data: {
                        owner_type: 'CONSULTANT',
                        owner_id: consultantId,
                        balance: 0,
                        status: 'ACTIVE'
                    }
                });
                accountId = newAccount.id;
            }

            await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: accountId,
                    type: VirtualTransactionType.COMMISSION_EARNED,
                    amount,
                    balance_after: (account?.balance || 0) + amount,
                    direction: 'CREDIT',
                    status: 'COMPLETED',
                    description: `Commission earned: ${description || type}`,
                    reference_id: commission.id,
                    reference_type: 'COMMISSION'
                }
            });

            await tx.virtualAccount.update({
                where: { id: accountId },
                data: { balance: { increment: amount }, total_credits: { increment: amount } }
            });

            return commission;
        });
    }

    /**
     * Request commission (consultant-initiated) - creates PENDING, no wallet credit.
     * Admin must confirm to credit VirtualAccount.
     */
    async requestCommission(input: RequestCommissionInput) {
        const {
            consultantId,
            amount: providedAmount,
            type,
            jobId,
            subscriptionId,
            description,
            rate,
            calculateFromJob = false
        } = input;

        let amount = providedAmount;
        let commissionRate = rate;

        if (calculateFromJob && (jobId || subscriptionId)) {
            if (jobId) {
                const job = await prisma.job.findUnique({
                    where: { id: jobId },
                    select: { payment_amount: true }
                });
                if (job?.payment_amount) {
                    const consultant = await prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate ?? consultant?.default_commission_rate ?? 0.20;
                    amount = job.payment_amount * commissionRate;
                }
            } else if (subscriptionId) {
                const subscription = await prisma.subscription.findUnique({
                    where: { id: subscriptionId },
                    select: { base_price: true }
                });
                if (subscription?.base_price) {
                    const consultant = await prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate ?? consultant?.default_commission_rate ?? 0.20;
                    amount = subscription.base_price * commissionRate;
                }
            }
        }

        if (!amount || amount <= 0) throw new HttpException(400, 'Commission amount must be positive');

        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { region_id: true }
        });
        if (!consultant) throw new HttpException(404, 'Consultant not found');
        if (!consultant.region_id) throw new HttpException(400, 'Consultant must have a region assigned');

        return prisma.commission.create({
            data: {
                consultant_id: consultantId,
                region_id: consultant.region_id,
                job_id: jobId ?? undefined,
                subscription_id: subscriptionId ?? undefined,
                type,
                amount,
                description: description || `Commission request: ${type}`,
                status: CommissionStatus.PENDING
            }
        });
    }

    async confirm(id: string, allowedRegionIds?: string[]) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission) throw new HttpException(404, 'Commission not found');
        if (allowedRegionIds && !allowedRegionIds.includes(commission.region_id)) {
            throw new HttpException(403, 'Access denied for this region');
        }

        if (commission.status === CommissionStatus.CONFIRMED) {
            return commission;
        }

        if (commission.status !== CommissionStatus.PENDING) {
            throw new HttpException(400, `Cannot confirm commission in status ${commission.status}`);
        }

        // PENDING → CONFIRMED: credit VirtualAccount so amount reflects in wallet
        return this.commissionRepository.transaction(async (tx) => {
            const consultantId = commission.consultant_id;
            const amount = Number(commission.amount);
            const description = commission.description || `Commission ${commission.type}`;

            let account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });

            if (!account) {
                account = await tx.virtualAccount.create({
                    data: {
                        owner_type: 'CONSULTANT',
                        owner_id: consultantId,
                        balance: 0,
                        status: 'ACTIVE'
                    }
                });
            }

            const balanceAfter = Number(account.balance) + amount;

            await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: account.id,
                    type: VirtualTransactionType.COMMISSION_EARNED,
                    amount,
                    balance_after: balanceAfter,
                    direction: 'CREDIT',
                    status: 'COMPLETED',
                    description: `Commission approved: ${description}`,
                    reference_id: commission.id,
                    reference_type: 'COMMISSION'
                }
            });

            await tx.virtualAccount.update({
                where: { id: account.id },
                data: { balance: { increment: amount }, total_credits: { increment: amount } }
            });

            return tx.commission.update({
                where: { id },
                data: { status: CommissionStatus.CONFIRMED, confirmed_at: new Date() }
            });
        });
    }

    async markAsPaid(id: string) {
        return this.commissionRepository.update(id, {
            status: CommissionStatus.PAID,
            paid_at: new Date()
        });
    }

    async processPayments(ids: string[]) {
        // Bulk pay
        await prisma.commission.updateMany({
            where: { id: { in: ids } },
            data: {
                status: CommissionStatus.PAID,
                paid_at: new Date()
            }
        });
    }

    async getRegional(regionId: string) {
        return this.commissionRepository.findMany({
            where: { region_id: regionId }
        });
    }

    /**
     * Dispute a commission
     */
    async dispute(id: string, reason: string) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission) throw new HttpException(404, 'Commission not found');

        return this.commissionRepository.update(id, {
            status: CommissionStatus.DISPUTED,
            notes: commission.notes ? `${commission.notes}\n[DISPUTE]: ${reason}` : `[DISPUTE]: ${reason}`
        });
    }

    /**
     * Resolve a commission dispute
     */
    async resolveDispute(id: string, resolution: 'VALID' | 'INVALID', notes?: string) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission) throw new HttpException(404, 'Commission not found');

        if (commission.status !== CommissionStatus.DISPUTED) {
            throw new HttpException(400, 'Commission is not disputed');
        }

        const resolutionNote = `[RESOLUTION]: ${resolution} - ${notes || ''}`;
        const updatedNotes = commission.notes ? `${commission.notes}\n${resolutionNote}` : resolutionNote;

        if (resolution === 'VALID') {
            // Restore to previous valid state (default to CONFIRMED if unclear, or check history? simplified: CONFIRMED)
            // If it was PAID, we should probably mark as PAID.
            // For now, let's restore to CONFIRMED as a safe default for active commissions.
            // TODO: Store previous status in metadata if strictness required.
            return this.commissionRepository.update(id, {
                status: CommissionStatus.CONFIRMED,
                notes: updatedNotes
            });
        } else {
            // Invalid commission -> Clawback
            return this.clawback(id, `Dispute resolved as INVALID. ${notes || ''}`);
        }
    }

    /**
     * Clawback (Reverse) a commission
     */
    async clawback(id: string, reason: string) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission) throw new HttpException(404, 'Commission not found');

        if (commission.status === CommissionStatus.CLAWBACK || commission.status === CommissionStatus.CANCELLED) {
            throw new HttpException(400, 'Commission already reversed');
        }

        // If PENDING, just cancel
        if (commission.status === CommissionStatus.PENDING) {
            return this.commissionRepository.update(id, {
                status: CommissionStatus.CANCELLED,
                notes: commission.notes ? `${commission.notes}\n[CANCELLED]: ${reason}` : `[CANCELLED]: ${reason}`
            });
        }

        // If CONFIRMED, PAID, or DISPUTED (post-confirm), we need to deduct wallet
        return this.commissionRepository.transaction(async (tx) => {
            const amount = Number(commission.amount);
            const consultantId = commission.consultant_id;

            const account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });

            if (account) {
                const balanceAfter = Number(account.balance) - amount;

                await tx.virtualTransaction.create({
                    data: {
                        virtual_account_id: account.id,
                        type: VirtualTransactionType.COMMISSION_CLAWBACK,
                        amount: amount,
                        balance_after: balanceAfter,
                        direction: 'DEBIT',
                        status: 'COMPLETED',
                        description: `Clawback: ${reason}`,
                        reference_id: commission.id,
                        reference_type: 'COMMISSION'
                    }
                });

                await tx.virtualAccount.update({
                    where: { id: account.id },
                    data: {
                        balance: { decrement: amount },
                        // Do we decrement total_credits? Usually no, total_credits is historical. 
                        // We might want a total_debits field or just leave balance.
                        // Leaving total_credits as is (historical earnings).
                    }
                });
            }

            return tx.commission.update({
                where: { id },
                data: {
                    status: CommissionStatus.CLAWBACK,
                    notes: commission.notes ? `${commission.notes}\n[CLAWBACK]: ${reason}` : `[CLAWBACK]: ${reason}`
                }
            });
        });
    }
}
