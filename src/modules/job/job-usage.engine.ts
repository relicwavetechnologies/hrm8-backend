import { SubscriptionService } from '../subscription/subscription.service';

/**
 * UsageEngine — Central decision layer for job publishing.
 *
 * This is the ONLY component allowed to decide publishing behavior.
 * It enforces the BRD separation:
 *   - Subscription is required for all job publishing (self-managed and HRM8-managed).
 *   - SYSTEM A (Subscription): publishing consumes quota counters only.
 *   - SYSTEM B (Wallet): HRM8 managed services use wallet only.
 */

export type PublishDecision =
    | 'USE_QUOTA'
    | 'QUOTA_EXHAUSTED'
    | 'REQUIRE_SUBSCRIPTION'
    | 'HRM8_MANAGED';

export class UsageEngine {
    /**
     * Resolve how a job should be published.
     *
     * @param companyId - The company publishing the job
     * @param hiringMode - The job's hiring mode (SELF_MANAGED, SHORTLISTING, FULL_SERVICE, EXECUTIVE_SEARCH, etc.)
     * @returns PublishDecision indicating next action
     */
    static async resolveJobPublish(
        companyId: string,
        hiringMode: string
    ): Promise<PublishDecision> {
        // All publish paths require an active subscription with available quota.
        const subscription = await SubscriptionService.getActiveSubscription(companyId);

        if (!subscription) {
            return 'REQUIRE_SUBSCRIPTION';
        }

        // Check quota (null quota = unlimited)
        if (
            subscription.job_quota !== null &&
            subscription.job_quota !== undefined &&
            subscription.jobs_used >= subscription.job_quota
        ) {
            return 'QUOTA_EXHAUSTED';
        }

        // All jobs (self-managed and HRM8-managed) consume subscription quota for publishing.
        // Managed-service payment is handled via upgradeToManagedService either post-publish
        // or as a separate step.
        return 'USE_QUOTA';
    }
}
