import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { ConsultantAuthenticatedRequest } from '../../types';

export class SalesController extends BaseController {
  private salesService: SalesService;

  constructor() {
    super();
    this.salesService = new SalesService(new SalesRepository());
  }

  // --- Opportunities ---

  getOpportunities = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const opportunities = await this.salesService.getOpportunities(req.consultant.id, {
        stage: req.query.stage as string,
        companyId: req.query.companyId as string
      });
      return this.sendSuccess(res, { opportunities });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getPipelineStats = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const stats = await this.salesService.getPipelineStats(req.consultant.id);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createOpportunity = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const opportunity = await this.salesService.createOpportunity({
        ...req.body,
        salesAgentId: req.consultant.id
      });
      return this.sendSuccess(res, { opportunity });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateOpportunity = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const opportunity = await this.salesService.updateOpportunity(id, req.body);
      return this.sendSuccess(res, { opportunity });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Activities ---

  getActivities = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const activities = await this.salesService.getActivities({
        consultantId: req.consultant.id,
        companyId: req.query.companyId as string,
        leadId: req.query.leadId as string,
        opportunityId: req.query.opportunityId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      });
      return this.sendSuccess(res, { activities });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createActivity = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const activity = await this.salesService.logActivity({
        ...req.body,
        createdBy: req.consultant.id
      });
      return this.sendSuccess(res, { activity });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
