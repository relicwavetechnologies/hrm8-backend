import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { AuthenticatedRequest } from '../../types';

export class SubscriptionController extends BaseController {
  private subscriptionService: SubscriptionService;

  constructor() {
    super();
    this.subscriptionService = new SubscriptionService(new SubscriptionRepository());
  }

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.companyId) return this.sendError(res, new Error('User/Company not found'));
      const subscription = await this.subscriptionService.createSubscription({
        ...req.body,
        companyId: req.user.companyId
      });
      return this.sendSuccess(res, subscription, 'Subscription created successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getActive = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = (req.params.companyId || (req.user && req.user.companyId)) as string;
      if (!companyId) return this.sendError(res, new Error('Company ID required'));

      const subscription = await this.subscriptionService.getActiveSubscription(companyId);
      return this.sendSuccess(res, subscription);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const subscription = await this.subscriptionService.getSubscriptionDetails(req.params.id as string);
      return this.sendSuccess(res, subscription);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = (req.params.companyId || (req.user && req.user.companyId)) as string;
      if (!companyId) return this.sendError(res, new Error('Company ID required'));

      const result = await this.subscriptionService.listSubscriptions(companyId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await this.subscriptionService.getSubscriptionStats(req.params.id as string);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  renew = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const subscription = await this.subscriptionService.renewSubscription(req.params.id as string);
      return this.sendSuccess(res, subscription, 'Subscription renewed successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancel = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const subscription = await this.subscriptionService.cancelSubscription(req.params.id as string);
      return this.sendSuccess(res, subscription, 'Subscription cancelled successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
