"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalSalesService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const audit_log_service_1 = require("./audit-log.service");
const audit_log_repository_1 = require("./audit-log.repository");
class RegionalSalesService extends service_1.BaseService {
    constructor(regionalSalesRepository) {
        super();
        this.regionalSalesRepository = regionalSalesRepository;
        this.auditLogService = new audit_log_service_1.AuditLogService(new audit_log_repository_1.AuditLogRepository());
    }
    async getLeads(regionId, regionIds, filters) {
        return this.regionalSalesRepository.findLeads(regionId, regionIds, filters);
    }
    async getOpportunities(regionId, regionIds, filters) {
        const consultants = await this.regionalSalesRepository.findRegionalConsultants(regionId, regionIds);
        const consultantIds = consultants.map(c => c.id);
        return this.regionalSalesRepository.findOpportunities(consultantIds, filters);
    }
    async getStats(regionId, regionIds) {
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
    async getActivities(regionId, regionIds) {
        const consultants = await this.regionalSalesRepository.findRegionalConsultants(regionId, regionIds);
        const consultantIds = consultants.map(c => c.id);
        return this.regionalSalesRepository.findActivities(consultantIds);
    }
    async reassignLead(leadId, newConsultantId, performedBy, assignedRegionIds, metadata) {
        const lead = await this.regionalSalesRepository.findLeadById(leadId);
        if (!lead)
            throw new http_exception_1.HttpException(404, 'Lead not found');
        if (performedBy.role !== 'GLOBAL_ADMIN' && assignedRegionIds && assignedRegionIds.length > 0) {
            if (!lead.region_id || !assignedRegionIds.includes(lead.region_id)) {
                throw new http_exception_1.HttpException(403, 'Access denied for lead region');
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
exports.RegionalSalesService = RegionalSalesService;
