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

  // Leads
  createLead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const lead = await this.salesService.createLead(req.body, req.consultant.id);
      return this.sendSuccess(res, { lead });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getMyLeads = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const leads = await this.salesService.getMyLeads(req.consultant.id);
      return this.sendSuccess(res, { leads });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  convert = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const leadId = req.params.id as string;
      const result = await this.salesService.convertLead(leadId, req.consultant.id, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Conversion Requests
  submitRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const leadId = req.params.id as string;
      const request = await this.salesService.submitConversionRequest(req.consultant.id, leadId, req.body);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getMyRequests = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const requests = await this.salesService.getMyRequests(req.consultant.id);
      return this.sendSuccess(res, { requests });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const request = await this.salesService.getRequest(req.params.id as string, req.consultant.id);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const request = await this.salesService.cancelRequest(req.params.id as string, req.consultant.id);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Dashboard
  getStats = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const stats = await this.salesService.getDashboardStats(req.consultant.id);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Opportunities
  getOpportunities = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const { stage, companyId } = req.query;
      const opportunities = await this.salesService.getOpportunities(req.consultant.id, {
        stage: stage as string,
        companyId: companyId as string
      });
      return this.sendSuccess(res, { opportunities });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createOpportunity = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const result = await this.salesService.createOpportunity({
        ...req.body,
        salesAgentId: req.consultant.id
      });
      return this.sendSuccess(res, { opportunity: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateOpportunity = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const result = await this.salesService.updateOpportunity(req.params.id as string, req.body);
      return this.sendSuccess(res, { opportunity: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getPipelineStats = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const stats = await this.salesService.getPipelineStats(req.consultant.id);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Companies
  getCompanies = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const { region, status } = req.query;
      const companies = await this.salesService.getCompanies(req.consultant.id, {
        region: region as string,
        status: status as string
      });
      return this.sendSuccess(res, { companies });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Commissions
  getCommissions = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const { status } = req.query;
      const commissions = await this.salesService.getCommissions(req.consultant.id, {
        status: status as string
      });
      return this.sendSuccess(res, { commissions });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Withdrawals
  getBalance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const balance = await this.salesService.getBalance(req.consultant.id);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  requestWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.requestWithdrawal(req.consultant.id, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWithdrawals = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { status } = req.query;
      const withdrawals = await this.salesService.getWithdrawals(req.consultant.id, { status: status as string });
      return this.sendSuccess(res, withdrawals);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.cancelWithdrawal(req.params.id as string, req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  executeWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.executeWithdrawal(req.params.id as string, req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Stripe
  stripeOnboard = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.initiateStripeOnboarding(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.getStripeStatus(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeLoginLink = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.getStripeLoginLink(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Activities
  getActivities = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { companyId, leadId, opportunityId, limit } = req.query;
      const activities = await this.salesService.getActivities({
        companyId: companyId as string,
        leadId: leadId as string,
        opportunityId: opportunityId as string,
        consultantId: req.consultant.id,
        limit: limit ? Number(limit) : undefined
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
