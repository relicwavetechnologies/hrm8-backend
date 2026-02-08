import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RegionalSalesService } from './regional-sales.service';
import { RegionalSalesRepository } from './regional-sales.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { OpportunityStage } from '@prisma/client';

export class RegionalSalesController extends BaseController {
    private regionalSalesService: RegionalSalesService;

    constructor() {
        super();
        this.regionalSalesService = new RegionalSalesService(new RegionalSalesRepository());
    }

    getLeads = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, status, assignedTo } = req.query;
            const result = await this.regionalSalesService.getLeads(
                regionId as string,
                req.assignedRegionIds,
                { status: status as string, assignedTo: assignedTo as string }
            );
            return this.sendSuccess(res, result);
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
            return this.sendSuccess(res, result);
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
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reassignLead = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { leadId } = req.params;
            const { newConsultantId } = req.body;
            const result = await this.regionalSalesService.reassignLead(
                leadId as string,
                newConsultantId as string,
                {
                    id: req.hrm8User?.id || 'system',
                    email: req.hrm8User?.email || 'unknown',
                    role: req.hrm8User?.role || 'UNKNOWN'
                },
                req.assignedRegionIds,
                {
                    ip: req.ip,
                    userAgent: req.get('user-agent') || undefined
                }
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
