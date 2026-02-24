import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ConsultantAuthenticatedRequest } from '../../types';
import { PayoutsService } from './payouts.service';

export class PayoutsController extends BaseController {
  private service = new PayoutsService();

  constructor() {
    super('payouts');
  }

  createBeneficiary = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.service.createBeneficiary(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.service.getStatus(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getLoginLink = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.service.getLoginLink(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  executeWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const withdrawalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.service.executeWithdrawal(withdrawalId, consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
