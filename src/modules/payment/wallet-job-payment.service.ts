import { BaseService } from '../../core/service';
import { WalletService } from '../wallet/wallet.service';
import { WalletPaymentCheckResult, WalletPaymentResult } from './payment.types';
import { ServicePackage, PricingService } from '../pricing/pricing.constants';
import { HttpException } from '../../core/http-exception';
import { CommissionService } from '../commission/commission.service';
import { prisma } from '../../utils/prisma';
import { Logger } from '../../utils/logger';

export class WalletJobPaymentService extends BaseService {
  private logger = Logger.create('payment:wallet-job');

  /**
   * Check if company has sufficient wallet balance to post a job
   * with the given service package
   */
  async checkCanPostJob(
    companyId: string,
    servicePackage: ServicePackage
  ): Promise<WalletPaymentCheckResult> {
    try {
      // Check if free package
      if (PricingService.isFreePackage(servicePackage)) {
        return {
          canPay: true,
          requiredAmount: 0,
          currentBalance: 0,
          message: 'Free package - no payment required',
        };
      }

      // Get required amount
      const requiredAmount = PricingService.getPriceInDollars(servicePackage);

      // Get wallet balance
      const balance = await WalletService.getBalance('COMPANY', companyId);

      const canPay = balance.balance >= requiredAmount;

      return {
        canPay,
        requiredAmount,
        currentBalance: balance.balance,
        deficit: !canPay ? requiredAmount - balance.balance : 0,
        message: canPay
          ? 'Sufficient balance available'
          : `Insufficient balance. Required: $${requiredAmount}, Available: $${balance.balance}`,
        errorCode: !canPay ? 'INSUFFICIENT_BALANCE' : undefined,
      };
    } catch (error: any) {
      this.logger.error('Error checking wallet payment eligibility:', error);
      throw new HttpException(
        500,
        'Failed to check payment eligibility'
      );
    }
  }

  /**
   * Process payment from company wallet for job posting
   * Uses atomic transaction to ensure consistency
   */
  async payForJobFromWallet(
    companyId: string,
    jobId: string,
    servicePackage: ServicePackage,
    userId?: string,
    jobTitle?: string
  ): Promise<WalletPaymentResult> {
    // Check if free package - no payment needed
    if (PricingService.isFreePackage(servicePackage)) {
      this.logger.info(`Free package for job ${jobId} - no payment required`);
      return {
        success: true,
        jobId,
        amount: 0,
        packageName: servicePackage,
        previousBalance: 0,
        newBalance: 0,
        commissionCreated: false,
      };
    }

    const amount = PricingService.getPriceInDollars(servicePackage);

    try {
      // Use atomic transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get current wallet balance within transaction
        const account = await tx.virtualAccount.findUnique({
          where: {
            owner_type_owner_id: {
              owner_type: 'COMPANY',
              owner_id: companyId,
            },
          },
        });

        if (!account) {
          throw new HttpException(404, 'Wallet account not found');
        }

        const previousBalance = account.balance;

        // 2. Double-check balance in transaction
        if (previousBalance < amount) {
          throw new HttpException(
            402,
            `Insufficient wallet balance. Required: $${amount}, Available: $${previousBalance}`
          );
        }

        // 3. Calculate new balance
        const newBalance = previousBalance - amount;

        // 4. Debit wallet with JOB_POSTING_DEDUCTION
        const transaction = await tx.virtualTransaction.create({
          data: {
            virtual_account_id: account.id,
            type: 'JOB_POSTING_DEDUCTION',
            amount,
            balance_after: newBalance,
            direction: 'DEBIT',
            status: 'COMPLETED',
            description: `Job posting payment - ${jobTitle || jobId} (${servicePackage})`,
            reference_id: jobId,
            reference_type: 'JOB',
            created_by: userId,
          },
        });

        // 5. Update wallet balance
        await tx.virtualAccount.update({
          where: { id: account.id },
          data: {
            balance: newBalance,
            total_debits: { increment: amount },
          },
        });

        // 6. Update job payment_status to PAID
        await tx.job.update({
          where: { id: jobId },
          data: {
            payment_status: 'PAID',
            payment_completed_at: new Date(),
            payment_amount: amount,
            payment_currency: 'USD',
          },
        });

        return {
          transaction,
          previousBalance,
          newBalance,
          account,
        };
      });

      // 7. Create sales commission async (non-blocking)
      this.createSalesCommissionAsync(
        companyId,
        jobId,
        amount,
        servicePackage,
        jobTitle
      ).catch((error) => {
        this.logger.error(
          `Failed to create commission for job ${jobId}:`,
          error
        );
        // Don't throw - commission creation is non-blocking
      });

      this.logger.info(
        `Successfully paid $${amount} from wallet for job ${jobId} (${servicePackage})`
      );

      return {
        success: true,
        transactionId: result.transaction.id,
        jobId,
        amount,
        packageName: servicePackage,
        previousBalance: result.previousBalance,
        newBalance: result.newBalance,
        paymentCompletedAt: new Date(),
        commissionCreated: false, // Will be set by async operation
      };
    } catch (error: any) {
      this.logger.error(
        `Payment processing failed for job ${jobId}:`,
        error
      );

      // Check for specific error types
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        500,
        error.message || 'Payment processing failed'
      );
    }
  }

  /**
   * Create sales commission asynchronously without blocking the payment
   * This is fire-and-forget
   */
  private async createSalesCommissionAsync(
    companyId: string,
    jobId: string,
    amount: number,
    servicePackage: ServicePackage,
    jobTitle?: string
  ): Promise<void> {
    try {
      const result = await CommissionService.processSalesCommission({
        companyId,
        amount,
        jobId,
        description: `Job posting commission - ${jobTitle || jobId} (${servicePackage})`,
        eventType: 'JOB_PAYMENT',
      });

      if (result.success) {
        this.logger.info(
          `Commission created for job ${jobId}: ${result.commissionId}`
        );
      } else {
        this.logger.warn(
          `Commission creation failed for job ${jobId}: ${result.error}`
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Unexpected error creating commission for job ${jobId}:`,
        error
      );
    }
  }
}

export const walletJobPaymentService = new WalletJobPaymentService();
