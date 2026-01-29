import { SubscriptionPlanType, BillingCycle } from '@prisma/client';

export interface CreateSubscriptionDTO {
    companyId: string;
    planType: SubscriptionPlanType;
    name: string;
    basePrice: number;
    billingCycle: BillingCycle;
    jobQuota?: number;
    discountPercent?: number;
    salesAgentId?: string;
    referredBy?: string;
    autoRenew?: boolean;
    startDate?: string;
}

export interface SubscriptionStats {
    jobsUsed: number;
    jobQuota: number | null;
    quotaRemaining: number | null;
    prepaidBalance: number | null;
    daysRemaining: number | null;
}
