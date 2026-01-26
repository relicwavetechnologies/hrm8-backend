import { prisma } from '../../utils/prisma';
import { CommissionStatus, CommissionType, HiringMode } from '@prisma/client';
import { differenceInMonths } from 'date-fns';
import { COMMISSION_RATES, SERVICE_FEES } from './types';
import { BaseService } from '../../core/service';

export class CommissionService extends BaseService {
    /**
     * Calculate commission amount based on hiring mode and service fee
     */
    static calculateCommissionAmount(
        hiringMode: HiringMode,
        serviceFee?: number
    ): { amount: number; rate: number } {
        // Self-managed jobs don't generate commissions
        if (hiringMode === 'SELF_MANAGED') {
            return { amount: 0, rate: 0 };
        }

        let baseFee: number;
        let rate: number;

        switch (hiringMode) {
            case 'SHORTLISTING':
                baseFee = serviceFee || SERVICE_FEES.SHORTLISTING;
                rate = COMMISSION_RATES.SHORTLISTING;
                break;
            case 'FULL_SERVICE':
                baseFee = serviceFee || SERVICE_FEES.FULL_SERVICE;
                rate = COMMISSION_RATES.FULL_SERVICE;
                break;
            case 'EXECUTIVE_SEARCH':
                baseFee = serviceFee || SERVICE_FEES.EXECUTIVE_SEARCH_UNDER_100K;
                rate = COMMISSION_RATES.EXECUTIVE_SEARCH;
                break;
            default:
                return { amount: 0, rate: 0 };
        }

        const commissionAmount = baseFee * rate;
        return { amount: Math.round(commissionAmount * 100) / 100, rate };
    }

    /**
     * Process generic sales commission (for both Job Payments and Subscription Upgrades)
     */
    static async processSalesCommission(params: {
        companyId: string;
        amount: number;
        description: string;
        jobId?: string;
        subscriptionId?: string;
        eventType?: 'JOB_PAYMENT' | 'SUBSCRIPTION_SALE';
    }): Promise<{ success: boolean; commissionId?: string; error?: string }> {
        try {
            const { companyId, amount, description, jobId, subscriptionId, eventType = 'SUBSCRIPTION_SALE' } = params;

            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { id: true, sales_agent_id: true, region_id: true, attribution_locked: true, attribution_locked_at: true }
            });

            if (!company) {
                return { success: false, error: 'Company not found' };
            }

            const salesAgentId = company.sales_agent_id;
            if (!salesAgentId) {
                return { success: false, error: 'No sales agent assigned to company' };
            }

            // Determine commission type based on event
            const commissionType = eventType === 'JOB_PAYMENT'
                ? CommissionType.RECRUITMENT_SERVICE
                : CommissionType.SUBSCRIPTION_SALE;

            // Check for existing commissions (idempotency)
            const existingCommission = await prisma.commission.findFirst({
                where: {
                    consultant_id: salesAgentId,
                    type: commissionType,
                    job_id: jobId || null,
                    subscription_id: subscriptionId || null
                }
            });

            if (existingCommission) {
                return { success: true, commissionId: existingCommission.id };
            }

            // Check attribution expiry (12-month rule)
            if (company.attribution_locked_at) {
                const monthsSinceLock = differenceInMonths(new Date(), new Date(company.attribution_locked_at));
                if (monthsSinceLock >= 12) {
                    return { success: false, error: 'Attribution expired' };
                }
            }

            // Fetch sales agent for dynamic rate
            const salesAgent = await prisma.consultant.findUnique({
                where: { id: salesAgentId },
                select: { default_commission_rate: true }
            });

            const commissionRate = salesAgent?.default_commission_rate || 0.10; // Default 10%
            const commissionAmount = Math.round(amount * commissionRate * 100) / 100;

            // Create Commission
            const commission = await prisma.commission.create({
                data: {
                    consultant: { connect: { id: salesAgentId } },
                    region: { connect: { id: company.region_id || '' } }, // Fallback logic needed if region is missing
                    job: jobId ? { connect: { id: jobId } } : undefined,
                    subscription: subscriptionId ? { connect: { id: subscriptionId } } : undefined,
                    type: commissionType,
                    amount: commissionAmount,
                    rate: commissionRate,
                    status: CommissionStatus.CONFIRMED,
                    description: description,
                }
            });

            // Auto-lock attribution on first payment
            if (!company.attribution_locked) {
                await prisma.company.update({
                    where: { id: companyId },
                    data: {
                        attribution_locked: true,
                        attribution_locked_at: new Date()
                    }
                });
            }

            return { success: true, commissionId: commission.id };

        } catch (error: any) {
            console.error('Process sales commission error:', error);
            return { success: false, error: error.message };
        }
    }
}
