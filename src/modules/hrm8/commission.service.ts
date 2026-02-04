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
    amount: number;
    rate?: number;
    description?: string;
    expiryDate?: Date;
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
            consultant_id: commission.consultant_id,
            region_id: commission.region_id,
            job_id: commission.job_id,
            subscription_id: commission.subscription_id,
            type: commission.type,
            amount: commission.amount,
            currency: 'USD',
            description: commission.description,
            status: commission.status,
            created_at: commission.created_at,
            confirmed_at: commission.confirmed_at,
            paid_at: commission.paid_at,
            payment_reference: commission.payment_reference,
            consultant: commission.consultant ? {
                id: commission.consultant.id,
                first_name: commission.consultant.first_name,
                last_name: commission.consultant.last_name,
                email: commission.consultant.email
            } : undefined
        };
    }

    async getAll(params: {
        limit?: number;
        offset?: number;
        consultantId?: string;
        regionId?: string;
        jobId?: string;
        companyId?: string;
        status?: string;
        commissionType?: string;
    }) {
        const {
            limit = 50,
            offset = 0,
            consultantId,
            regionId,
            jobId,
            companyId,
            status,
            commissionType
        } = params;
        const where: any = {};
        if (consultantId) where.consultant_id = consultantId;
        if (regionId) where.region_id = regionId;
        if (jobId) where.job_id = jobId;
        if (companyId) where.subscription = { company_id: companyId };
        if (status) where.status = status;
        if (commissionType) where.type = commissionType;

        const [commissions, total] = await Promise.all([
            this.commissionRepository.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: { consultant: true, subscription: true }
            }),
            this.commissionRepository.count(where),
        ]);

        return { commissions: commissions.map(c => this.mapToDTO(c)), total };
    }

    async getById(id: string) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission) throw new HttpException(404, 'Commission not found');
        return this.mapToDTO(commission);
    }

    async create(input: AwardCommissionInput) {
        const { consultantId, amount, type, jobId, subscriptionId, description } = input;

        if (amount <= 0) throw new HttpException(400, 'Commission amount must be positive');

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

            return this.mapToDTO(commission);
        });
    }

    async confirm(id: string) {
        // Typically used if status was PENDING. 
        const updated = await this.commissionRepository.update(id, {
            status: CommissionStatus.CONFIRMED,
            confirmed_at: new Date()
        });
        return this.mapToDTO(updated);
    }

    async markAsPaid(id: string, paymentReference?: string) {
        const updated = await this.commissionRepository.update(id, {
            status: CommissionStatus.PAID,
            paid_at: new Date(),
            ...(paymentReference ? { payment_reference: paymentReference } : {})
        });
        return this.mapToDTO(updated);
    }

    async processPayments(ids: string[], paymentReference?: string) {
        // Bulk pay
        await prisma.commission.updateMany({
            where: { id: { in: ids } },
            data: {
                status: CommissionStatus.PAID,
                paid_at: new Date(),
                ...(paymentReference ? { payment_reference: paymentReference } : {})
            }
        });
    }

    async getRegional(regionId: string) {
        const commissions = await this.commissionRepository.findMany({
            where: { region_id: regionId }
        });
        return commissions.map(c => this.mapToDTO(c));
    }
}
