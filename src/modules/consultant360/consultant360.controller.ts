import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { Consultant360Service } from './consultant360.service';
import { Consultant360Repository } from './consultant360.repository';
import { ConsultantAuthenticatedRequest } from '../../types';
import { HttpException } from '../../core/http-exception';

export class Consultant360Controller extends BaseController {
  private service: Consultant360Service;

  constructor() {
    super();
    this.service = new Consultant360Service(new Consultant360Repository());
  }

  // Dashboard
  getDashboard = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const dashboard = await this.service.getDashboard(consultantId);
      return this.sendSuccess(res, dashboard);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Leads
  getLeads = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const status = req.query.status as string;
      const region = req.query.region as string;

      const leads = await this.service.getLeads(consultantId, { status, region });
      return this.sendSuccess(res, { leads });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createLead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const lead = await this.service.createLead(consultantId, req.body);
      return this.sendSuccess(res, { lead });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  submitConversionRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const { leadId } = req.params;
      const conversionRequest = await this.service.submitConversionRequest(consultantId, leadId as string, req.body);
      return this.sendSuccess(res, { conversionRequest });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Earnings
  getEarnings = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const earnings = await this.service.getEarnings(consultantId);
      return this.sendSuccess(res, earnings);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Commissions
  getCommissions = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const status = req.query.status as string;
      const commissions = await this.service.getCommissions(consultantId, { status });
      return this.sendSuccess(res, { commissions });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Balance
  getBalance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const balance = await this.service.getBalance(consultantId);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Withdrawals
  requestWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const withdrawal = await this.service.requestWithdrawal(consultantId, req.body);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWithdrawals = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const status = req.query.status as string;
      const withdrawals = await this.service.getWithdrawals(consultantId, { status });
      return this.sendSuccess(res, { withdrawals });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const { id } = req.params;
      const withdrawal = await this.service.cancelWithdrawal(id as string, consultantId);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  executeWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const { id } = req.params;
      const withdrawal = await this.service.executeWithdrawal(id as string, consultantId);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Stripe
  stripeOnboard = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const result = await this.service.initiateStripeOnboarding(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const status = await this.service.getStripeStatus(consultantId);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeLoginLink = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        throw new HttpException(401, 'Unauthorized');
      }

      const link = await this.service.getStripeLoginLink(consultantId);
      return this.sendSuccess(res, link);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
