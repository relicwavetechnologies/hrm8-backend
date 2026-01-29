import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { ConsultantAuthenticatedRequest } from '../../types';
import { LeadConversionService } from './lead-conversion.service';
import { LeadConversionRepository } from './lead-conversion.repository';
import { AuthService } from '../auth/auth.service';
import { AuthRepository } from '../auth/auth.repository';
import { CompanyService } from '../company/company.service';
import { CompanyRepository } from '../company/company.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';

export class SalesController extends BaseController {
  private salesService: SalesService;
  private leadConversionService: LeadConversionService;

  constructor() {
    super();
    const salesRepo = new SalesRepository();
    this.salesService = new SalesService(salesRepo);
    this.leadConversionService = new LeadConversionService(
      new LeadConversionRepository(),
      salesRepo,
      new AuthService(new AuthRepository()),
      new CompanyService(new CompanyRepository()),
      new NotificationService(new NotificationRepository())
    );
  }

  // --- Leads ---

  createLead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const lead = await this.salesService.createLead(req.body, req.consultant.id);
      return this.sendSuccess(res, { lead });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getMyLeads = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const leads = await this.salesService.getMyLeads(req.consultant.id);
      return this.sendSuccess(res, { leads });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  convert = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      if (!req.params.id) return this.sendError(res, new Error('Lead ID required'));
      const opportunity = await this.salesService.convertLead(req.params.id as string, req.body, req.consultant.id);
      return this.sendSuccess(res, { opportunity });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  // --- Conversion Requests ---

  submitRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      if (!req.params.id) return this.sendError(res, new Error('Lead ID required'));
      const request = await this.leadConversionService.submitRequest(req.params.id as string, req.consultant.id, req.body);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getMyRequests = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const requests = await this.leadConversionService.getMyRequests(req.consultant.id);
      return this.sendSuccess(res, { requests });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      if (!req.params.id) return this.sendError(res, new Error('Request ID required'));
      // Note: LeadConversionService currently doesn't have a single getRequestById with auth, 
      // but findById from repo handles it. For now using getAll with filter as a workaround or I'll just use the repo's findById.
      // Actually LeadConversionService should have it.
      const requests = await this.leadConversionService.getMyRequests(req.consultant.id);
      const request = requests.find(r => r.id === req.params.id);
      if (!request) return this.sendError(res, new Error('Request not found or unauthorized'), 404);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  cancelRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      if (!req.params.id) return this.sendError(res, new Error('Request ID required'));
      const request = await this.leadConversionService.cancelRequest(req.params.id as string, req.consultant.id);
      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
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

  // --- Withdrawals ---

  getBalance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const balance = await this.salesService.getBalance(req.consultant.id);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  requestWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const withdrawal = await this.salesService.requestWithdrawal(req.consultant.id, req.body.amount, req.body.method);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getWithdrawals = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const withdrawals = await this.salesService.getWithdrawals(req.consultant.id);
      return this.sendSuccess(res, { withdrawals });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  cancelWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const withdrawal = await this.salesService.cancelWithdrawal(req.params.id as string, req.consultant.id);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  executeWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      // This ideally should be an admin route, assuming consultant auth here for parity with old routes
      // but normally only admin can execute. 
      // If the old route was /commissions/withdrawals/:id/execute and under sales group, it might be a weird placement.
      // I'll leave it as stub or strictly check if user is admin (req.user) if mixed auth is used.
      // The old file 'sales.ts' had 'authenticateConsultant' middleware on ALL routes!
      // This means Consultants could execute their own withdrawals? That's a security flaw in old system.
      // I will implement it but maybe restrict or throw not implemented if it's supposed to be admin.
      // For migration fidelity, I implement it but maybe it fails auth if logic requires admin.

      return this.sendError(res, new Error('Not implemented for security reasons - validation required'), 501);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  // --- Stripe ---

  stripeOnboard = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.stripeOnboard(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getStripeStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.getStripeStatus(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getStripeLoginLink = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.getStripeLoginLink(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  // --- Dashboard ---

  getStats = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.getDashboardStats(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getCompanies = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.getCompanies(req.consultant.id);
      return this.sendSuccess(res, { companies: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getCommissions = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.salesService.getCommissions(req.consultant.id);
      return this.sendSuccess(res, { commissions: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  }

}
