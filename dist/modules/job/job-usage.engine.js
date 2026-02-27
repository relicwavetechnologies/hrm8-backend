"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageEngine = void 0;
const subscription_service_1 = require("../subscription/subscription.service");
class UsageEngine {
    /**
     * Resolve how a job should be published.
     *
     * @param companyId - The company publishing the job
     * @param hiringMode - The job's hiring mode (SELF_MANAGED, SHORTLISTING, FULL_SERVICE, EXECUTIVE_SEARCH, etc.)
     * @returns PublishDecision indicating next action
     */
    static async resolveJobPublish(companyId, hiringMode) {
        // All publish paths require an active subscription with available quota.
        const subscription = await subscription_service_1.SubscriptionService.getActiveSubscription(companyId);
        if (!subscription) {
            return 'REQUIRE_SUBSCRIPTION';
        }
        // Check quota (null quota = unlimited)
        if (subscription.job_quota !== null &&
            subscription.job_quota !== undefined &&
            subscription.jobs_used >= subscription.job_quota) {
            return 'QUOTA_EXHAUSTED';
        }
        // All jobs (self-managed and HRM8-managed) consume subscription quota for publishing.
        // Managed-service payment is handled via upgradeToManagedService either post-publish
        // or as a separate step.
        return 'USE_QUOTA';
    }
}
exports.UsageEngine = UsageEngine;
