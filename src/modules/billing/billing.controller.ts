import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { BillingService } from './billing.service';
import { AuthenticatedRequest } from '../../types';

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
      const signature = (req.headers['x-airwallex-signature'] as string) || '';
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const result = await BillingService.processWebhook(rawBody, signature, req.body);
      return res.status(200).json({ received: true, ...result });
    } catch (error) {
      if ((error as any)?.statusCode === 401) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
      return this.sendError(res, error);
    }
  };
}
