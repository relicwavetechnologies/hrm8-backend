import { prisma } from '../../utils/prisma';
import { OpportunityStage, ConsultantRole } from '@prisma/client';

export class RegionalSalesRepository {
    async findRegionalConsultants(regionId?: string, regionIds?: string[]) {
        const where: any = {
            role: { in: ['SALES_AGENT', 'CONSULTANT_360'] }
        };
        if (regionId) where.region_id = regionId;
        if (regionIds) where.region_id = { in: regionIds };

        return prisma.consultant.findMany({
            where,
            select: { id: true, first_name: true, last_name: true, email: true }
        });
    }

    async findOpportunities(consultantIds: string[], filters?: { stage?: OpportunityStage; salesAgentId?: string }) {
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
