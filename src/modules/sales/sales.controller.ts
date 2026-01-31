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

  // --- Dashboard ---
  getDashboardStats = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const stats = await this.salesService.getDashboardStats(req.consultant.id);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Leads ---
  getLeads = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const { status, region } = req.query;
      const leads = await this.salesService.getLeads(req.consultant.id, {
        status: status as string,
        region: region as string
      });
      return this.sendSuccess(res, { leads });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createLead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const lead = await this.salesService.createLead(req.consultant.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { lead });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  convertLead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
      const result = await this.salesService.convertLead(leadId, req.consultant.id, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  submitConversionRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
      const request = await this.salesService.submitConversionRequest(req.consultant.id, leadId, req.body);
      res.status(201);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Conversion Requests ---
  getConversionRequests = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const requests = await this.salesService.getConversionRequests(req.consultant.id);
      return this.sendSuccess(res, { requests });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getConversionRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const request = await this.salesService.getConversionRequest(id, req.consultant.id);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelConversionRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const request = await this.salesService.cancelConversionRequest(id, req.consultant.id);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Companies ---
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

  // --- Commissions ---
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

  getWithdrawalBalance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const balance = await this.salesService.getWithdrawalBalance(req.consultant.id);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Withdrawals ---
  requestWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const withdrawal = await this.salesService.requestWithdrawal(req.consultant.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWithdrawals = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const { status } = req.query;
      const withdrawals = await this.salesService.getWithdrawals(req.consultant.id, {
        status: status as string
      });
      return this.sendSuccess(res, { withdrawals });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const withdrawal = await this.salesService.cancelWithdrawal(id, req.consultant.id);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  executeWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const withdrawal = await this.salesService.executeWithdrawal(id, req.consultant.id);
      return this.sendSuccess(res, { withdrawal, message: 'Withdrawal execution initiated' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Stripe ---
  getStripeStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const status = await this.salesService.getStripeStatus(req.consultant.id);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  initiateStripeOnboarding = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const result = await this.salesService.initiateStripeOnboarding(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeLoginLink = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'), 401);
      const result = await this.salesService.getStripeLoginLink(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Opportunities ---

  getOpportunities = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const isHrm8Admin = res.locals.isHrm8Admin === true;
      const opportunities = await this.salesService.getOpportunities(isHrm8Admin ? null : req.consultant.id, {
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
      const isHrm8Admin = res.locals.isHrm8Admin === true;
      const stats = await this.salesService.getPipelineStats(isHrm8Admin ? null : req.consultant.id);
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
