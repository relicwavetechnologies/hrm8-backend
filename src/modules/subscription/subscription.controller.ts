import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { SubscriptionService } from './subscription.service';
import { AuthenticatedRequest } from '../../types';

export class SubscriptionController extends BaseController {
  
  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId || req.user?.id; // Assuming user is company admin
      if (!companyId) return this.sendError(res, new Error('Unauthorized'), 401);

      const subscription = await SubscriptionService.createSubscription({
        ...req.body,
        companyId
      });
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getActive = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = (req.params.companyId || req.params.id || req.user?.companyId) as string;
      if (!companyId) return this.sendError(res, new Error('Company ID required'), 400);

      // Verify access
      if (req.user?.companyId && req.user.companyId !== companyId && req.user.role !== 'ADMIN') {
        return this.sendError(res, new Error('Unauthorized'), 403);
      }

      const subscription = await SubscriptionService.getActiveSubscription(companyId);

      if (!subscription) {
        return this.sendSuccess(res, null);
      }
      
      const PLAN_HIERARCHY = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM', 'PAYG', 'SMALL', 'MEDIUM', 'LARGE', 'RPO'];
      const currentPlanIndex = PLAN_HIERARCHY.indexOf(subscription.plan_type);
      const canUpgrade = currentPlanIndex >= 0 && currentPlanIndex < PLAN_HIERARCHY.length - 2;
      const nextTier = canUpgrade ? PLAN_HIERARCHY[currentPlanIndex + 1] : null;

      const usagePercent = subscription.job_quota && subscription.job_quota > 0 
          ? (subscription.jobs_used / subscription.job_quota) * 100 
          : 0;

      // Format for dashboard
      return this.sendSuccess(res, {
        subscription,
        canUpgrade,
        nextTier,
        usagePercent: Math.round(usagePercent)
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return this.sendError(res, new Error('Unauthorized'), 401);

        const subscriptions = await SubscriptionService.listSubscriptions(companyId);

        // Return subscriptions directly (not wrapped) to match old backend format
        return this.sendSuccess(res, subscriptions);
    } catch (error) {
        return this.sendError(res, error);
    }
  };
}
