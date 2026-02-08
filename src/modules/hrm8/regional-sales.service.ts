import { BaseService } from '../../core/service';
import { RegionalSalesRepository } from './regional-sales.repository';
import { OpportunityStage } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';

export class RegionalSalesService extends BaseService {
    private auditLogService: AuditLogService;

    constructor(private regionalSalesRepository: RegionalSalesRepository) {
        super();
        this.auditLogService = new AuditLogService(new AuditLogRepository());
    }

    async getLeads(regionId?: string, regionIds?: string[], filters?: { status?: string; assignedTo?: string }) {
        const consultants = await this.regionalSalesRepository.findRegionalConsultants(regionId, regionIds);
        const consultantIds = consultants.map(c => c.id);
        return this.regionalSalesRepository.findLeads(consultantIds, filters);
    }

    async getOpportunities(regionId?: string, regionIds?: string[], filters?: { stage?: OpportunityStage; salesAgentId?: string }) {
        const consultants = await this.regionalSalesRepository.findRegionalConsultants(regionId, regionIds);
        const consultantIds = consultants.map(c => c.id);
        return this.regionalSalesRepository.findOpportunities(consultantIds, filters);
    }

    async getStats(regionId?: string, regionIds?: string[]) {
        const consultants = await this.regionalSalesRepository.findRegionalConsultants(regionId, regionIds);
        const consultantIds = consultants.map(c => c.id);
        const opportunities = await this.regionalSalesRepository.findOpportunities(consultantIds);

        const totalPipelineValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        const weightedPipelineValue = opportunities.reduce((sum, opp) => {
            const amount = opp.amount || 0;
            const prob = opp.probability || 0;
            return sum + (amount * (prob / 100));
        }, 0);

        return {
            totalPipelineValue,
            weightedPipelineValue,
            dealCount: opportunities.length,
            activeAgents: consultantIds.length
        };
    }

    async getActivities(regionId?: string, regionIds?: string[]) {
        const consultants = await this.regionalSalesRepository.findRegionalConsultants(regionId, regionIds);
        const consultantIds = consultants.map(c => c.id);
        return this.regionalSalesRepository.findActivities(consultantIds);
    }

    async reassignLead(
        leadId: string,
        newConsultantId: string,
        performedBy: { id: string; email: string; role: string },
        assignedRegionIds?: string[],
        metadata?: { ip?: string; userAgent?: string }
    ) {
        const lead = await this.regionalSalesRepository.findLeadById(leadId);
        if (!lead) throw new HttpException(404, 'Lead not found');

        if (performedBy.role !== 'GLOBAL_ADMIN' && assignedRegionIds && assignedRegionIds.length > 0) {
            if (!lead.region_id || !assignedRegionIds.includes(lead.region_id)) {
                throw new HttpException(403, 'Access denied for lead region');
            }
        }

        const reassignment = await this.regionalSalesRepository.reassignLead(leadId, newConsultantId, performedBy.id);

        await this.auditLogService.log({
            entityType: 'lead',
            entityId: leadId,
            action: 'LEAD_SALES_AGENT_REASSIGNED',
            performedBy: performedBy.id,
            performedByEmail: performedBy.email,
            performedByRole: performedBy.role,
            changes: {
                leadId,
                companyName: lead.company_name,
                previousSalesAgentId: lead.assigned_consultant_id,
                newSalesAgentId: newConsultantId,
            },
            ipAddress: metadata?.ip,
            userAgent: metadata?.userAgent,
            description: `Reassigned sales agent for lead ${lead.company_name}`,
        });

        return reassignment;
    }
}
