import { prisma } from '../../utils/prisma';
import { SubscriptionService } from '../subscription/subscription.service';

/**
 * UsageEngine — Central decision layer for job publishing.
 *
 * PAYG (no subscription): First job free, then invoice required.
 * Paid plans: Quota consumed; over-quota jobs require invoice (AI stays on).
 * Plan expired: Upgrade or fall to PAYG (no AI).
 */

export type PublishDecision =
    | 'USE_QUOTA'
    | 'QUOTA_EXHAUSTED'
    | 'OVER_QUOTA_PAYG'
    | 'REQUIRE_SUBSCRIPTION'
    | 'PAYG_FREE_FIRST'
    | 'PAYG_REQUIRE_INVOICE'
    | 'PLAN_EXPIRED'
    | 'HRM8_MANAGED';

const PAID_PLAN_TYPES = ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'];

export class UsageEngine {
    /**
     * Resolve how a job should be published.
     */
    static async resolveJobPublish(
        companyId: string,
        _hiringMode: string
    ): Promise<PublishDecision> {
        const subscription = await SubscriptionService.getActiveSubscription(companyId);

        if (!subscription) {
            const publishedCount = await prisma.job.count({
                where: {
                    company_id: companyId,
                    status: 'OPEN',
                    posting_date: { not: null },
                },
            });
            return publishedCount === 0 ? 'PAYG_FREE_FIRST' : 'PAYG_REQUIRE_INVOICE';
        }

        const planType = String(subscription.plan_type).toUpperCase();
        const isPaidPlan = PAID_PLAN_TYPES.includes(planType);
        const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
        const isExpired = endDate && endDate < new Date();

        if (isExpired && isPaidPlan) {
            return 'PLAN_EXPIRED';
        }

        if (!isPaidPlan) {
            const publishedCount = await prisma.job.count({
                where: {
                    company_id: companyId,
                    status: 'OPEN',
                    posting_date: { not: null },
                },
            });
            return publishedCount === 0 ? 'PAYG_FREE_FIRST' : 'PAYG_REQUIRE_INVOICE';
        }

        const quota = subscription.job_quota;
        const used = subscription.jobs_used ?? 0;

        if (quota !== null && quota !== undefined && used >= quota) {
            return 'OVER_QUOTA_PAYG';
        }

        return 'USE_QUOTA';
    }
}
