import { PaymentStatus, VirtualTransactionType } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { BaseService } from '../../core/service';
import { WalletService } from '../wallet/wallet.service';

export type ServicePackage = 'self-managed' | 'shortlisting' | 'full-service' | 'executive-search';

export const UPGRADE_PRICE_MAP = {
    shortlisting: { amount: 1990, currency: 'usd', label: 'Shortlisting' },
    full_service: { amount: 5990, currency: 'usd', label: 'Full Service' },
    executive_search: { amount: 9990, currency: 'usd', label: 'Executive Search' },
} as const;

export class JobPaymentService extends BaseService {
    /**
     * Get payment amount for a service package
     */
    static getPaymentAmount(servicePackage: ServicePackage | string): { amount: number; currency: string } | null {
        if (servicePackage === 'self-managed') {
            return null;
        }

        const packageKeyMap: Record<string, string> = {
            'shortlisting': 'shortlisting',
            'full-service': 'full_service',
            'executive-search': 'executive_search',
        };
        const packageKey = packageKeyMap[servicePackage] || servicePackage;
        const priceInfo = (UPGRADE_PRICE_MAP as any)[packageKey.replace('-', '_')];

        if (!priceInfo) {
            return null;
        }

        return {
            amount: priceInfo.amount,
            currency: priceInfo.currency,
        };
    }

    /**
     * Check if a service package requires payment
     */
    static requiresPayment(servicePackage: ServicePackage | string): boolean {
        return servicePackage !== 'self-managed';
    }

    /**
     * Process payment for a job from wallet
     */
    async payForJobFromWallet(companyId: string, jobId: string, servicePackage: ServicePackage | string, userId: string): Promise<{ success: boolean; error?: string }> {
        const paymentInfo = JobPaymentService.getPaymentAmount(servicePackage);

        // If free, no payment needed
        if (!paymentInfo || paymentInfo.amount === 0) {
            return { success: true };
        }

        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Get account
                const account = await WalletService.getOrCreateAccount('COMPANY', companyId);

                // 2. Check balance
                if (account.balance < paymentInfo.amount) {
                    throw new Error(`Insufficient wallet balance. Required: $${paymentInfo.amount.toFixed(2)}, Available: $${account.balance.toFixed(2)}.`);
                }

                // 3. Debit account
                await tx.virtualTransaction.create({
                    data: {
                        virtual_account_id: account.id,
                        type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
                        amount: paymentInfo.amount,
                        balance_after: account.balance - paymentInfo.amount,
                        direction: 'DEBIT',
                        status: 'COMPLETED',
                        description: `Job posting payment (${servicePackage})`,
                        reference_type: 'JOB',
                        reference_id: jobId,
                        created_by: userId
                    }
                });

                await tx.virtualAccount.update({
                    where: { id: account.id },
                    data: {
                        balance: { decrement: paymentInfo.amount },
                        total_debits: { increment: paymentInfo.amount }
                    }
                });

                // 4. Update job payment status
                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        payment_status: 'PAID',
                        payment_amount: paymentInfo.amount,
                        payment_currency: paymentInfo.currency,
                        payment_completed_at: new Date(),
                    }
                });

                return { success: true };
            });
        } catch (error: any) {
            console.error('Wallet payment failed:', error);
            return { success: false, error: error.message || 'Payment failed' };
        }
    }
}

export const jobPaymentService = new JobPaymentService();
