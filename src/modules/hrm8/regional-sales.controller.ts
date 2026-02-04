import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RegionalSalesService } from './regional-sales.service';
import { RegionalSalesRepository } from './regional-sales.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { OpportunityStage } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';

export class RegionalSalesController extends BaseController {
    private regionalSalesService: RegionalSalesService;
    private auditLogService: AuditLogService;

    constructor() {
        super();
        this.regionalSalesService = new RegionalSalesService(new RegionalSalesRepository());
        this.auditLogService = new AuditLogService(new AuditLogRepository());
    }

    private async logAction(
        req: Hrm8AuthenticatedRequest,
        entityId: string,
        action: string,
        changes?: Record<string, unknown>,
        description?: string
    ) {
        const actor = req.hrm8User;
        await this.auditLogService.log({
            entityType: 'LEAD',
            entityId,
            action,
            performedBy: actor?.id || 'system',
            performedByEmail: actor?.email || 'unknown',
            performedByRole: actor?.role || 'SYSTEM',
            changes,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string | undefined,
            description,
        });
    }

    getLeads = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, status, assignedTo } = req.query;
            const result = await this.regionalSalesService.getLeads(
                regionId as string,
                req.assignedRegionIds,
                { status: status as string, assignedTo: assignedTo as string }
            );
            return this.sendSuccess(res, { leads: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getOpportunities = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, stage, salesAgentId } = req.query;
            const result = await this.regionalSalesService.getOpportunities(
                regionId as string,
                req.assignedRegionIds,
                { stage: stage as OpportunityStage, salesAgentId: salesAgentId as string }
            );
            return this.sendSuccess(res, { opportunities: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStats = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.query;
            const result = await this.regionalSalesService.getStats(
                regionId as string,
                req.assignedRegionIds
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getActivities = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.query;
            const result = await this.regionalSalesService.getActivities(
                regionId as string,
                req.assignedRegionIds
            );
            return this.sendSuccess(res, { activities: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reassignLead = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { leadId } = req.params;
            const { newConsultantId } = req.body;
            // TODO: Authorization check - is user allowed to manage this lead/region?
            const result = await this.regionalSalesService.reassignLead(
                leadId as string,
                newConsultantId as string,
                req.hrm8User?.id || 'system'
            );
            await this.logAction(
                req,
                leadId as string,
                'REASSIGN',
                { newConsultantId },
                'Lead reassigned'
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
