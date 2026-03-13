import { prisma } from '../../utils/prisma';
import { SubscriptionStatus } from '@prisma/client';

/**
 * Feature gate for AI-powered features (screening, copilot, analysis).
 * PAYG and expired plans: AI disabled. Paid plans (SMALL, MEDIUM, LARGE, ENTERPRISE): AI enabled.
 * Over-quota on paid plan: AI still enabled (plan is active).
 */
const AI_ENABLED_PLAN_TYPES = ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'] as const;

export interface CanUseAiResult {
  canUseAi: boolean;
  reason?: 'PAYG' | 'PLAN_EXPIRED' | 'NO_SUBSCRIPTION' | 'OK';
  planType?: string;
}

export class FeatureGateService {
  /**
   * Check if a company can use AI features (screening, copilot, analysis).
   * Security-critical: All AI endpoints must call this before spending tokens.
   */
  static async canUseAiFeatures(companyId: string): Promise<CanUseAiResult> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        company_id: companyId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { created_at: 'desc' },
      select: {
        plan_type: true,
        end_date: true,
        status: true,
      },
    });

    if (!subscription) {
      return { canUseAi: false, reason: 'NO_SUBSCRIPTION' };
    }

    const planType = String(subscription.plan_type).toUpperCase();
    const isPaidPlan = AI_ENABLED_PLAN_TYPES.includes(planType as (typeof AI_ENABLED_PLAN_TYPES)[number]);

    if (!isPaidPlan) {
      return { canUseAi: false, reason: 'PAYG', planType };
    }

    const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
    if (endDate && endDate < new Date()) {
      return { canUseAi: false, reason: 'PLAN_EXPIRED', planType };
    }

    return { canUseAi: true, reason: 'OK', planType };
  }

  /**
   * Throws HttpException 403 with AI_SCREENING_REQUIRES_UPGRADE if company cannot use AI.
   */
  static async assertCanUseAi(companyId: string, errorCode = 'AI_SCREENING_REQUIRES_UPGRADE'): Promise<void> {
    const result = await this.canUseAiFeatures(companyId);
    if (!result.canUseAi) {
      const { HttpException } = await import('../../core/http-exception');
      const message =
        result.reason === 'PLAN_EXPIRED'
          ? 'Your plan has expired. Upgrade to restore AI features.'
          : 'AI features require a paid plan (Small or higher). Upgrade to unlock.';
      throw new HttpException(403, message, errorCode);
    }
  }
}
