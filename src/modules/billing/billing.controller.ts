import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { BillingService } from './billing.service';
import { AuthenticatedRequest } from '../../types';
import { AirwallexService } from '../airwallex/airwallex.service';

export class BillingController extends BaseController {
  constructor() {
    super('billing');
  }

  createCheckout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await BillingService.createCheckout(
        {
          companyId: req.user.companyId,
          userId: req.user.id,
          userEmail: req.user.email,
        },
        req.body || {}
      );

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const paymentAttemptId = req.params.paymentAttemptId;
      const status = await BillingService.getPaymentStatus(paymentAttemptId);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  refundPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const paymentAttemptId = req.params.paymentAttemptId;
      const result = await BillingService.refundPayment(paymentAttemptId, req.body?.reason);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  handleAirwallexWebhook = async (req: Request, res: Response) => {
    try {
      const parsed = AirwallexService.parseWebhook(req.body);
      if (!parsed.paymentAttemptId || !parsed.status) {
        return res.status(200).json({ received: true, ignored: true });
      }

      if (parsed.status === 'SUCCEEDED') {
        await BillingService.markPaymentSucceeded(parsed.paymentAttemptId, parsed.providerTransactionId);
      } else {
        await BillingService.markPaymentFailed(parsed.paymentAttemptId);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
