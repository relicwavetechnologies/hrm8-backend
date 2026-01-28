import { Prisma, LeadConversionRequest, ConversionRequestStatus } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class LeadConversionRepository extends BaseRepository {
    async create(data: Prisma.LeadConversionRequestCreateInput): Promise<LeadConversionRequest> {
        return this.prisma.leadConversionRequest.create({ data });
    }

    async update(id: string, data: Prisma.LeadConversionRequestUpdateInput): Promise<LeadConversionRequest> {
        return this.prisma.leadConversionRequest.update({ where: { id }, data });
    }

    async findById(id: string): Promise<LeadConversionRequest | null> {
        return this.prisma.leadConversionRequest.findUnique({
            where: { id },
            include: {
                lead: true,
                consultant: { select: { id: true, first_name: true, last_name: true, email: true } },
                reviewer: { select: { id: true, first_name: true, last_name: true, email: true } },
                company: true
            }
        });
    }

    async findAll(filters: {
        status?: ConversionRequestStatus;
        region_id?: string;
        region_ids?: string[];
        consultant_id?: string;
    }): Promise<LeadConversionRequest[]> {
        const where: Prisma.LeadConversionRequestWhereInput = {};

        if (filters.status) where.status = filters.status;
        if (filters.consultant_id) where.consultant_id = filters.consultant_id;
        if (filters.region_id) where.region_id = filters.region_id;
        if (filters.region_ids) where.region_id = { in: filters.region_ids };

        return this.prisma.leadConversionRequest.findMany({
            where,
            orderBy: { created_at: 'desc' },
            include: {
                lead: { select: { id: true, company_name: true, email: true } },
                consultant: { select: { id: true, first_name: true, last_name: true } },
                region: { select: { id: true, name: true } }
            }
        });
    }

    async countByLeadAndStatus(leadId: string, statuses: ConversionRequestStatus[]): Promise<number> {
        return this.prisma.leadConversionRequest.count({
            where: {
                lead_id: leadId,
                status: { in: statuses }
            }
        });
    }
}
