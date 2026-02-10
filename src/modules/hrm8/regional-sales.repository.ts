import { prisma } from '../../utils/prisma';
import { OpportunityStage, ConsultantRole } from '@prisma/client';

export class RegionalSalesRepository {
    async findLeadById(id: string) {
        return prisma.lead.findUnique({
            where: { id },
            select: {
                id: true,
                region_id: true,
                assigned_consultant_id: true,
                company_name: true,
            }
        });
    }

    async findRegionalConsultants(regionId?: string, regionIds?: string[]) {
        const where: any = {
            role: { in: ['SALES_AGENT', 'CONSULTANT_360'] }
        };

        let targetRegionId = regionId;
        if (targetRegionId === 'all' || targetRegionId === 'Global') {
            targetRegionId = undefined;
        }

        if (targetRegionId) {
            where.region_id = targetRegionId;
        }

        if (regionIds && regionIds.length > 0) {
            if (where.region_id) {
                // If asking for specific region, ensure it's in allowed list
                if (!regionIds.includes(where.region_id)) return [];
            } else {
                // Otherwise filter by all allowed
                where.region_id = { in: regionIds };
            }
        }

        return prisma.consultant.findMany({
            where,
            select: { id: true, first_name: true, last_name: true, email: true }
        });
    }

    async findOpportunities(consultantIds: string[], filters?: { stage?: OpportunityStage; salesAgentId?: string }) {
        if (consultantIds.length === 0) return [];
        return prisma.opportunity.findMany({
            where: {
                sales_agent_id: { in: consultantIds },
                stage: filters?.stage,
                ...(filters?.salesAgentId ? { sales_agent_id: filters.salesAgentId } : {})
            },
            include: {
                company: { select: { id: true, name: true, domain: true } }
            },
            orderBy: { updated_at: 'desc' }
        });
    }

    async findLeads(regionId?: string, regionIds?: string[], filters?: { status?: string; assignedTo?: string }) {
        let targetRegionId = regionId;
        if (targetRegionId === 'all' || targetRegionId === 'Global') {
            targetRegionId = undefined;
        }

        const where: any = {
            ...(filters?.status ? { status: filters.status as any } : {}),
            ...(filters?.assignedTo ? { assigned_consultant_id: filters.assignedTo } : {})
        };

        if (targetRegionId) {
            where.region_id = targetRegionId;
        } else if (regionIds && regionIds.length > 0) {
            where.region_id = { in: regionIds };
        }

        return prisma.lead.findMany({
            where,
            include: {
                consultant: { select: { id: true, first_name: true, last_name: true, email: true } },
                creator: { select: { id: true, first_name: true, last_name: true, email: true } },
                company: { select: { id: true, name: true } }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async findActivities(consultantIds: string[], limit = 50) {
        return prisma.activity.findMany({
            where: { created_by: { in: consultantIds } },
            orderBy: { created_at: 'desc' },
            take: limit,
            include: {
                lead: { select: { id: true, company_name: true } },
                opportunity: { select: { id: true, name: true } },
                company: { select: { id: true, name: true } }
            }
        });
    }

    async reassignLead(leadId: string, newConsultantId: string, performedBy: string) {
        // Update the Lead record
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                assigned_consultant_id: newConsultantId,
                assigned_at: new Date(),
                assigned_by: performedBy,
                assignment_mode: 'MANUAL'
            }
        });

        // Update active assignment in ConsultantLeadAssignment (if tracked separately)
        // Set existing active assignment to INACTIVE
        await prisma.consultantLeadAssignment.updateMany({
            where: { lead_id: leadId, status: 'ACTIVE' },
            data: { status: 'INACTIVE' }
        });

        // Create new assignment
        return prisma.consultantLeadAssignment.create({
            data: {
                lead_id: leadId,
                consultant_id: newConsultantId,
                assigned_by: performedBy,
                status: 'ACTIVE'
            }
        });
    }
}
