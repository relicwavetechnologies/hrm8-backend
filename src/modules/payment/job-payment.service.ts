import { BaseService } from '../../core/service';
import { ServicePackage, PricingService } from '../pricing/pricing.constants';
import { WalletJobPaymentService } from './wallet-job-payment.service';
import { HttpException } from '../../core/http-exception';
import { Logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';

export class JobPaymentService extends BaseService {
  private logger = Logger.create('payment:job');
  private walletPaymentService = new WalletJobPaymentService();

  /**
   * Get payment amount for a service package
   */
  async getPaymentAmount(servicePackage: ServicePackage): Promise<number> {
    return PricingService.getPriceInDollars(servicePackage);
  }

  /**
   * Check if service package requires payment
   */
  async requiresPayment(servicePackage: string): Promise<boolean> {
    return !PricingService.isFreePackage(servicePackage as ServicePackage);
  }

  /**
   * Check if job can be published (payment-wise)
   * This is called before publishing a job
   */
  async canPublishJob(jobId: string): Promise<boolean> {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new HttpException(404, 'Job not found');
      }

      // If job requires payment and is not paid, cannot publish
      const requiresPayment = await this.requiresPayment(
        job.service_package || 'self-managed'
      );

      if (requiresPayment && job.payment_status !== 'PAID') {
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`Error checking if job can be published:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, 'Failed to check job publication status');
    }
  }

  /**
   * Process payment for job posting
   * This is the main entry point called from JobService.publishJob()
   */
  async processJobPayment(
    jobId: string,
    companyId: string,
    userId?: string
  ): Promise<void> {
    try {
      // 1. Get job details
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new HttpException(404, 'Job not found');
      }

      // 2. Check ownership
      if (job.company_id !== companyId) {
        throw new HttpException(403, 'Unauthorized to modify this job');
      }

      const servicePackage = (job.service_package as ServicePackage) || 'self-managed';

      // 3. Check if payment is required
      const needsPayment = await this.requiresPayment(servicePackage);

      if (!needsPayment) {
        this.logger.info(`Free package - no payment required for job ${jobId}`);
        return;
      }

      // 4. Check if already paid
      if (job.payment_status === 'PAID') {
        this.logger.info(`Job ${jobId} already paid - skipping payment`);
        return;
      }

      // 5. Check wallet balance
      const paymentCheck = await this.walletPaymentService.checkCanPostJob(
        companyId,
        servicePackage
      );

      if (!paymentCheck.canPay) {
        throw new HttpException(
          402,
          `Insufficient wallet balance. ${paymentCheck.message}`
        );
      }

      // 6. Process payment from wallet
      const paymentResult = await this.walletPaymentService.payForJobFromWallet(
        companyId,
        jobId,
        servicePackage,
        userId,
        job.title
      );

      if (!paymentResult.success) {
        throw new HttpException(
          402,
          paymentResult.error || 'Payment processing failed'
        );
      }

      this.logger.info(
        `Payment processed for job ${jobId}: $${paymentResult.amount} (${servicePackage})`
      );
    } catch (error: any) {
      this.logger.error(`Payment processing error for job ${jobId}:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        error.message || 'Payment processing failed'
      );
    }
  }

  /**
   * Create job checkout session (for Stripe wallet recharge)
   * This is used for wallet top-ups, not direct job payment
   */
  async createJobCheckoutSession(data: any): Promise<any> {
    // This is handled by StripeService for wallet recharge
    throw new HttpException(
      501,
      'Use StripeService.createCheckoutSession for wallet recharge'
    );
  }
}

export const jobPaymentService = new JobPaymentService();
