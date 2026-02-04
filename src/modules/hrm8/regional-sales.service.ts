import { BaseService } from '../../core/service';
import { RegionalSalesRepository } from './regional-sales.repository';
import { OpportunityStage } from '@prisma/client';

export class RegionalSalesService extends BaseService {
    constructor(private regionalSalesRepository: RegionalSalesRepository) {
        super();
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

    async reassignLead(leadId: string, newConsultantId: string, performedBy: string) {
        return this.regionalSalesRepository.reassignLead(leadId, newConsultantId, performedBy);
    }
}
