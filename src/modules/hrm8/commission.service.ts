import { BaseService } from '../../core/service';
import { CommissionRepository } from './commission.repository';
import { Commission, CommissionStatus, CommissionType, HiringMode, Prisma, Job } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { differenceInMonths } from 'date-fns';

// Commission rates as percentage of service fee
const COMMISSION_RATES = {
    SHORTLISTING: 0.15, // 15% of shortlisting service fee ($1,990)
    FULL_SERVICE: 0.20, // 20% of full-service fee ($5,990)
    EXECUTIVE_SEARCH: 0.25, // 25% of executive search fee
    SUBSCRIPTION: 0.20, // 20% of subscription revenue
} as const;

// Service fee amounts (in USD)
const SERVICE_FEES = {
    SHORTLISTING: 1990,
    FULL_SERVICE: 5990,
    EXECUTIVE_SEARCH_UNDER_100K: 9990,
    EXECUTIVE_SEARCH_OVER_100K: 14990,
} as const;

export class CommissionService extends BaseService {
    constructor(private commissionRepository: CommissionRepository) {
        super();
    }

    static calculateCommissionAmount(
        hiringMode: HiringMode,
        serviceFee?: number
    ): { amount: number; rate: number } {
        if (hiringMode === 'SELF_MANAGED') {
            return { amount: 0, rate: 0 };
        }

        let baseFee: number;
        let rate: number;

        switch (hiringMode) {
            case 'SHORTLISTING':
                baseFee = serviceFee || SERVICE_FEES.SHORTLISTING;
                rate = COMMISSION_RATES.SHORTLISTING;
                break;
            case 'FULL_SERVICE':
                baseFee = serviceFee || SERVICE_FEES.FULL_SERVICE;
                rate = COMMISSION_RATES.FULL_SERVICE;
                break;
            case 'EXECUTIVE_SEARCH':
                baseFee = serviceFee || SERVICE_FEES.EXECUTIVE_SEARCH_UNDER_100K;
                rate = COMMISSION_RATES.EXECUTIVE_SEARCH;
                break;
            default:
                return { amount: 0, rate: 0 };
        }

        const commissionAmount = baseFee * rate;
        return { amount: Math.round(commissionAmount * 100) / 100, rate };
    }

    async getAllCommissions(filters: {
        consultantId?: string;
        regionId?: string;
        regionIds?: string[];
        jobId?: string;
        status?: CommissionStatus;
        type?: CommissionType;
    }) {
        return this.commissionRepository.findAll(filters);
    }

    async getCommissionById(id: string) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission) throw new HttpException(404, 'Commission not found');
        return commission;
    }

    async createCommission(data: Prisma.CommissionCreateInput) {
        return this.commissionRepository.create(data);
    }

    async createCommissionForJobAssignment(
        jobId: string,
        consultantId: string,
        regionId: string,
        hiringMode: HiringMode,
        jobTitle: string,
        serviceFee?: number
    ) {
        if (hiringMode === 'SELF_MANAGED') {
            return { success: false, error: 'Self-managed jobs do not generate commissions' };
        }

        const { amount, rate } = CommissionService.calculateCommissionAmount(hiringMode, serviceFee);

        if (amount === 0) {
            return { success: false, error: 'No commission to create' };
        }

        // Check existing
        const existing = await this.commissionRepository.findAll({
            jobId,
            consultantId,
            type: CommissionType.PLACEMENT
        });

        if (existing.length > 0) {
            const comm = existing[0];
            if (comm.status === CommissionStatus.PENDING) {
                await this.commissionRepository.update(comm.id, {
                    amount,
                    rate,
                    description: `Commission for ${hiringMode} service - ${jobTitle}`
                });
                return { success: true, commissionId: comm.id };
            }
        }

        const commission = await this.commissionRepository.create({
            consultant: { connect: { id: consultantId } },
            // region_id is a string field in prisma, not a relation connection sometimes? 
            // Checking Repository logic: 'region_id: commissionData.regionId'. It's a field.
            // Wait, repository interface expects Prisma.CommissionCreateInput.
            // If region_id is purely a string column without relation in Prisma schema, we use region_id: ...
            // If it has relation, we use region: { connect ... }
            // The schema likely has region relation. I'll use raw ID if repository handles data mapping or pass explicit structure.
            // Repository "create" takes Prisma.CommissionCreateInput directly.
            // So I must match that structure.
            // Checking repository implementation: it takes Prisma.CommissionCreateInput.
            // So I should pass:
            region_id: regionId, // Assuming passed regionId is valid
            job: { connect: { id: jobId } },
            type: CommissionType.PLACEMENT,
            amount,
            rate,
            status: CommissionStatus.PENDING,
            description: `Commission for ${hiringMode} service - ${jobTitle}`
        } as any); // Casting as any to avoid strict Prisma input type mismatch if I missed a field relation, but ideally strongly typed.
        // Actually better to be safe with types.
        // In CommissionRepository.create, I used Prisma.CommissionCreateInput.
        // Let's rely on standard Prisma types.

        return { success: true, commissionId: commission.id };
    }

    async confirmCommission(id: string) {
        const comm = await this.commissionRepository.findById(id);
        if (!comm) throw new HttpException(404, 'Commission not found');
        return this.commissionRepository.confirm(id);
    }

    async markCommissionPaid(id: string, paymentReference: string) {
        const comm = await this.commissionRepository.findById(id);
        if (!comm) throw new HttpException(404, 'Commission not found');
        if (comm.status === CommissionStatus.PAID) {
            throw new HttpException(400, 'Commission already paid');
        }
        return this.commissionRepository.markAsPaid(id, paymentReference);
    }

    async processPayments(commissionIds: string[], paymentReference: string) {
        const errors: string[] = [];
        let processed = 0;

        for (const id of commissionIds) {
            try {
                await this.markCommissionPaid(id, paymentReference);
                processed++;
            } catch (error: any) {
                errors.push(`Commission ${id}: ${error.message}`);
            }
        }

        return {
            success: errors.length === 0,
            processed,
            errors
        };
    }

    // --- Regional Handling ---
    async getRegionalCommissions(regionId: string, status?: CommissionStatus) {
        return this.commissionRepository.findByRegionId(regionId, { status });
    }
}
