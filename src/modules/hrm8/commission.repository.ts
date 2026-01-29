import { BaseRepository } from '../../core/repository';
import { CommissionStatus, CommissionType, Prisma } from '@prisma/client';
import { CommissionData } from './commission.types';

export class CommissionRepository extends BaseRepository {

    private getDefaultIncludes() {
        return {
            job: { select: { company: { select: { name: true } } } },
            subscription: { select: { company: { select: { name: true } } } }
        };
    }

    // Map Prisma object to CommissionData (camelCase)
    private mapToData(item: any): CommissionData {
        const companyName = item.job?.company?.name || item.subscription?.company?.name;
        return {
            id: item.id,
            consultantId: item.consultant_id,
            regionId: item.region_id,
            jobId: item.job_id,
            subscriptionId: item.subscription_id,
            type: item.type,
            amount: item.amount,
            rate: item.rate,
            description: item.description,
            status: item.status,
            confirmedAt: item.confirmed_at,
            paidAt: item.paid_at,
            commissionExpiryDate: item.commission_expiry_date,
            paymentReference: item.payment_reference,
            notes: item.notes,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            companyName
        };
    }

    async create(data: Prisma.CommissionCreateInput): Promise<CommissionData> {
        const res = await this.prisma.commission.create({
            data,
            include: this.getDefaultIncludes()
        });
        return this.mapToData(res);
    }

    async findById(id: string): Promise<CommissionData | null> {
        const res = await this.prisma.commission.findUnique({
            where: { id },
            include: this.getDefaultIncludes()
        });
        return res ? this.mapToData(res) : null;
    }

    async findAll(filters: {
        consultantId?: string;
        regionId?: string;
        regionIds?: string[];
        jobId?: string;
        status?: CommissionStatus;
        type?: CommissionType;
    }): Promise<CommissionData[]> {
        const where: Prisma.CommissionWhereInput = {
            ...(filters.consultantId && { consultant_id: filters.consultantId }),
            ...(filters.regionId && { region_id: filters.regionId }),
            ...(filters.regionIds && { region_id: { in: filters.regionIds } }),
            ...(filters.jobId && { job_id: filters.jobId }),
            ...(filters.status && { status: filters.status }),
            ...(filters.type && { type: filters.type }),
        };

        const res = await this.prisma.commission.findMany({
            where,
            include: this.getDefaultIncludes(),
            orderBy: { created_at: 'desc' }
        });
        return res.map(i => this.mapToData(i));
    }

    async findByConsultantId(consultantId: string, filters?: { status?: CommissionStatus; type?: CommissionType }) {
        return this.findAll({ consultantId, ...filters });
    }

    async findByRegionId(regionId: string, filters?: { status?: CommissionStatus }) {
        return this.findAll({ regionId, ...filters });
    }

    async update(id: string, data: Prisma.CommissionUpdateInput): Promise<CommissionData> {
        const res = await this.prisma.commission.update({
            where: { id },
            data,
            include: this.getDefaultIncludes()
        });
        return this.mapToData(res);
    }

    async confirm(id: string): Promise<CommissionData> {
        return this.update(id, {
            status: CommissionStatus.CONFIRMED,
            confirmed_at: new Date()
        });
    }

    async markAsPaid(id: string, paymentReference?: string): Promise<CommissionData> {
        return this.update(id, {
            status: CommissionStatus.PAID,
            paid_at: new Date(),
            payment_reference: paymentReference
        });
    }

    async cancel(id: string): Promise<CommissionData> {
        return this.update(id, {
            status: CommissionStatus.CANCELLED
        });
    }
}
