import { prisma } from '../../utils/prisma';
import { CommissionService } from '../commission/commission.service';
import { WalletService } from '../wallet/wallet.service';
import { UPGRADE_PRICE_MAP } from '../commission/types';
import { PaymentStatus } from '@prisma/client';

export class JobPaymentService {
    /**
     * Get payment amount for a service package
     */
    static getPaymentAmount(servicePackage: string): { amount: number; currency: string } | null {
        if (servicePackage === 'self-managed') {
            return null;
        }

        const packageKey = servicePackage.replace('-', '_') as keyof typeof UPGRADE_PRICE_MAP;
        const priceInfo = UPGRADE_PRICE_MAP[packageKey];

        if (!priceInfo) return null;

        return {
            amount: priceInfo.amount,
            currency: priceInfo.currency,
        };
    }

    /**
     * Check if a job requires payment and process it from wallet
     */
    static async processJobPayment(jobId: string, companyId: string, userId?: string): Promise<boolean> {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { title: true, service_package: true, payment_status: true }
        });

        if (!job) throw new Error('Job not found');
        if (job.payment_status === 'PAID') return true;

        const servicePackage = job.service_package || 'self-managed';
        const paymentInfo = this.getPaymentAmount(servicePackage);

        if (!paymentInfo) {
            // Free package
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    payment_status: 'PAID',
                    payment_completed_at: new Date()
                }
            });
            return true;
        }

        try {
            // Deduct from wallet
            await WalletService.debitForJobPosting({
                companyId,
                jobId,
                amount: paymentInfo.amount,
                description: `Payment for job: ${job.title} (${servicePackage})`,
                createdBy: userId || 'SYSTEM'
            });

            // Update job status
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    payment_status: 'PAID',
                    payment_amount: paymentInfo.amount,
                    payment_currency: paymentInfo.currency,
                    payment_completed_at: new Date()
                }
            });

            // Process commission
            await CommissionService.processSalesCommission({
                companyId,
                amount: paymentInfo.amount,
                description: `Commission for Job Posting: ${job.title}`,
                jobId,
                eventType: 'JOB_PAYMENT'
            });

            return true;
        } catch (error: any) {
            console.error('Job payment processing failed:', error);
            throw error;
        }
    }
}
