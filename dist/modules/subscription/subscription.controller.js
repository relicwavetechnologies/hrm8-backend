"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const controller_1 = require("../../core/controller");
const subscription_service_1 = require("./subscription.service");
class SubscriptionController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        this.create = async (req, res) => {
            try {
                const companyId = req.user?.companyId || req.user?.id; // Assuming user is company admin
                if (!companyId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const subscription = await subscription_service_1.SubscriptionService.createSubscription({
                    ...req.body,
                    companyId
                });
                return this.sendSuccess(res, { subscription });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getActive = async (req, res) => {
            try {
                const companyId = (req.params.companyId || req.user?.companyId);
                if (!companyId)
                    return this.sendError(res, new Error('Company ID required'), 400);
                // Verify access
                if (req.user?.companyId && req.user.companyId !== companyId && req.user.role !== 'ADMIN') {
                    return this.sendError(res, new Error('Unauthorized'), 403);
                }
                const subscription = await subscription_service_1.SubscriptionService.getActiveSubscription(companyId);
                if (!subscription) {
                    return this.sendSuccess(res, null);
                }
                const PLAN_HIERARCHY = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];
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
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.list = async (req, res) => {
            try {
                const companyId = req.user?.companyId;
                if (!companyId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const subscriptions = await subscription_service_1.SubscriptionService.listSubscriptions(companyId);
                // Return subscriptions directly (not wrapped) to match old backend format
                return this.sendSuccess(res, subscriptions);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.SubscriptionController = SubscriptionController;
