import { Prisma, Lead, LeadConversionRequest, Commission } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class Consultant360Repository extends BaseRepository {

    // Leads
    async findLeads(consultantId: string, filters: {
        status?: string;
        search?: string;
        skip?: number;
        take?: number
    }): Promise<{ leads: Lead[]; total: number }> {
        const where: Prisma.LeadWhereInput = {
            assigned_consultant_id: consultantId,
            ...(filters.status && { status: filters.status as any }),
            ...(filters.search && {
                OR: [
                    { company_name: { contains: filters.search, mode: 'insensitive' } },
                    { email: { contains: filters.search, mode: 'insensitive' } }
                ]
            })
        };

        const [leads, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip: filters.skip,
                take: filters.take,
                orderBy: { created_at: 'desc' }
            }),
            this.prisma.lead.count({ where })
        ]);

        return { leads, total };
    }

    async createLead(data: Prisma.LeadCreateInput): Promise<Lead> {
        return this.prisma.lead.create({ data });
    }

    async findLeadById(id: string, consultantId: string): Promise<Lead | null> {
        return this.prisma.lead.findFirst({
            where: { id, assigned_consultant_id: consultantId }
        });
    }

    // Conversion Requests
    async createConversionRequest(data: Prisma.LeadConversionRequestCreateInput): Promise<LeadConversionRequest> {
        return this.prisma.leadConversionRequest.create({ data });
    }

    async findConversionRequestByLead(leadId: string): Promise<LeadConversionRequest | null> {
        return this.prisma.leadConversionRequest.findFirst({
            where: { lead_id: leadId, status: 'PENDING' }
        });
    }

    // Stats
    async getLeadStats(consultantId: string) {
        const stats = await this.prisma.lead.groupBy({
            by: ['status'],
            where: { assigned_consultant_id: consultantId },
            _count: true
        });
        return stats;
    }
}
