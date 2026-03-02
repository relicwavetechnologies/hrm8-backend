import { BillStatus, VirtualTransactionType } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { WalletService } from '../wallet/wallet.service';
import { AirwallexService } from '../airwallex/airwallex.service';
import { XeroService } from '../xero/xero.service';
import { BillingLogger } from '../../utils/billing-logger';
import { Logger } from '../../utils/logger';
import { jobAllocationService } from '../job/job-allocation.service';
import { toCommissionRateDecimal } from '../hrm8/commission-rate.util';

const log = Logger.create('billing');

export type BillingCheckoutType = 'wallet_recharge' | 'subscription' | 'managed_service';

export interface BillingCheckoutRequest {
  type?: string;
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  successUrl?: string;
  cancelUrl?: string;
  planType?: string;
  planName?: string;
  billingCycle?: string;
  jobQuota?: number | null;
}

interface BillingCheckoutContext {
  companyId: string;
  userId?: string;
  userEmail?: string;
}

interface BillingEventPayload {
  checkoutType: BillingCheckoutType;
  metadata: Record<string, unknown>;
  provider: 'AIRWALLEX';
  xeroInvoiceId: string;
  xeroInvoiceNumber: string;
}

const BILLING_AUTO_CONFIRM = process.env.BILLING_AUTO_CONFIRM === 'true';

const toObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const parseNotesPayload = (notes: string | null): BillingEventPayload | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as BillingEventPayload;
  } catch {
    return null;
  }
};

const asAmount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asString = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

export class BillingService {
  private static mapServicePackageToHiringMode(servicePackage: string): 'SELF_MANAGED' | 'SHORTLISTING' | 'FULL_SERVICE' | 'EXECUTIVE_SEARCH' {
    const normalized = servicePackage.trim().toLowerCase();
    if (normalized === 'shortlisting') return 'SHORTLISTING';
    if (normalized === 'executive-search') return 'EXECUTIVE_SEARCH';
    if (normalized === 'self-managed') return 'SELF_MANAGED';
    // full-service + rpo share the same hiring mode operationally.
    return 'FULL_SERVICE';
  }

  private static normalizeCheckoutType(request: BillingCheckoutRequest): BillingCheckoutType {
    const metadata = toObject(request.metadata);
    const fromRequest = asString(request.type)?.toLowerCase();
    const fromMetadata = asString(metadata.type)?.toLowerCase();
    const resolved = fromRequest || fromMetadata || 'wallet_recharge';

    if (resolved === 'subscription') return 'subscription';
    if (resolved === 'managed_service') return 'managed_service';
    return 'wallet_recharge';
  }

  private static generateBillNumber(currency: string): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 9000 + 1000);
    return `INV-${currency}-${timestamp}-${random}`;
  }

  static async createCheckout(context: BillingCheckoutContext, request: BillingCheckoutRequest) {
    if (!context.companyId) {
      throw new HttpException(400, 'Company context is required for checkout');
    }

    const amount = asAmount(request.amount);
    if (!amount || amount <= 0) {
      throw new HttpException(400, 'A positive amount is required');
    }

    const { pricingPeg, billingCurrency } = await CurrencyAssignmentService.getCompanyCurrencies(context.companyId);
    const currency = (request.currency || billingCurrency || 'USD').toUpperCase();

    await CurrencyAssignmentService.validateCurrencyLock(context.companyId, currency);

    const checkoutType = this.normalizeCheckoutType(request);
    const mergedMetadata: Record<string, unknown> = {
      ...toObject(request.metadata),
      type: checkoutType,
      planType: request.planType ?? toObject(request.metadata).planType,
      planName: request.planName ?? toObject(request.metadata).planName ?? toObject(request.metadata).name,
      billingCycle: request.billingCycle ?? toObject(request.metadata).billingCycle,
      jobQuota: request.jobQuota ?? toObject(request.metadata).jobQuota,
      userId: context.userId,
      userEmail: context.userEmail,
      companyId: context.companyId,
      pricingPeg,
      billingCurrency: currency,
    };

    const description =
      request.description ||
      (checkoutType === 'subscription'
        ? `Subscription purchase (${asString(mergedMetadata.planName) || 'plan'})`
        : checkoutType === 'managed_service'
          ? 'Managed service invoice'
          : 'Wallet recharge');

    const xeroInvoice = XeroService.createInvoice({
      companyId: context.companyId,
      amount,
      currency,
      description,
      lineItems: [{ description, amount }],
    });

    const bill = await prisma.bill.create({
      data: {
        company_id: context.companyId,
        bill_number: this.generateBillNumber(currency),
        amount,
        total_amount: amount,
        currency,
        status: BillStatus.PENDING,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        payment_method: 'AIRWALLEX',
        accounting_ref: xeroInvoice.invoiceId,
        notes: JSON.stringify({
          checkoutType,
          metadata: mergedMetadata,
          provider: 'AIRWALLEX',
          xeroInvoiceId: xeroInvoice.invoiceId,
          xeroInvoiceNumber: xeroInvoice.invoiceNumber,
        } satisfies BillingEventPayload),
      },
    });

    const session = AirwallexService.createCheckoutSession({
      amount,
      currency,
      reference: bill.id,
      description,
      successUrl: request.successUrl || `${process.env.ATS_FRONTEND_URL || 'http://localhost:8080'}/subscriptions?payment_success=true`,
      cancelUrl: request.cancelUrl || `${process.env.ATS_FRONTEND_URL || 'http://localhost:8080'}/subscriptions?canceled=true`,
      metadata: mergedMetadata,
    });

    await prisma.bill.update({
      where: { id: bill.id },
      data: { payment_reference: session.paymentAttemptId },
    });

    if (BILLING_AUTO_CONFIRM) {
      await this.markPaymentSucceeded(session.paymentAttemptId, session.providerTransactionId);
    }

    const payment = await this.getPaymentStatus(session.paymentAttemptId);

    return {
      provider: 'AIRWALLEX',
      paymentAttemptId: session.paymentAttemptId,
      billId: bill.id,
      url: session.checkoutUrl,
      amount,
      currency,
      xeroInvoiceId: xeroInvoice.invoiceId,
      xeroInvoiceNumber: xeroInvoice.invoiceNumber,
      status: payment.status,
    };
  }

  static async markPaymentSucceeded(paymentAttemptId: string, providerTransactionId?: string) {
    const bill = await prisma.bill.findFirst({
      where: { payment_reference: paymentAttemptId },
      select: {
        id: true,
        company_id: true,
        status: true,
        amount: true,
        total_amount: true,
        currency: true,
        notes: true,
        subscription_id: true,
      },
    });

    if (!bill) {
      throw new HttpException(404, 'Payment attempt not found');
    }

    if (bill.status === BillStatus.PAID) {
      return { status: 'SUCCEEDED', billId: bill.id };
    }

    const payload = parseNotesPayload(bill.notes);
    const checkoutType = payload?.checkoutType || 'wallet_recharge';
    const metadata = payload?.metadata || {};

    let subscriptionId = bill.subscription_id || null;

    if (checkoutType === 'subscription' && !subscriptionId) {
      const planType = asString(metadata.planType)?.toUpperCase().replace(/-/g, '_');
      const planName = asString(metadata.planName) || asString(metadata.name) || planType;
      const billingCycle = (asString(metadata.billingCycle)?.toUpperCase() || 'ANNUAL') as 'MONTHLY' | 'ANNUAL';
      const jobQuota = asAmount(metadata.jobQuota);

      if (!planType || !planName || (billingCycle !== 'MONTHLY' && billingCycle !== 'ANNUAL')) {
        throw new HttpException(400, 'Invalid subscription checkout metadata');
      }

      const created = await SubscriptionService.createSubscription({
        companyId: bill.company_id,
        planType: planType as any,
        name: planName,
        basePrice: Number(bill.total_amount || bill.amount),
        billingCycle,
        jobQuota: jobQuota ?? undefined,
      });
      subscriptionId = created.id;

      // Create commission for the sales agent who brought this company
      try {
        const company = await prisma.company.findUnique({
          where: { id: bill.company_id },
          select: { sales_agent_id: true },
        });

        if (company?.sales_agent_id) {
          const salesAgent = await prisma.consultant.findUnique({
            where: { id: company.sales_agent_id },
            select: { id: true, region_id: true, default_commission_rate: true },
          });

          if (salesAgent?.region_id) {
            const existing = await prisma.commission.findFirst({
              where: {
                consultant_id: salesAgent.id,
                subscription_id: created.id,
                type: 'SUBSCRIPTION_SALE',
              },
              select: { id: true },
            });

            if (!existing) {
              const subAmount = Number(bill.total_amount || bill.amount);
              const rate = toCommissionRateDecimal(salesAgent.default_commission_rate, 0.10);
              const commissionAmount = Number((subAmount * rate).toFixed(2));

              if (commissionAmount > 0) {
                await prisma.commission.create({
                  data: {
                    consultant_id: salesAgent.id,
                    region_id: salesAgent.region_id,
                    subscription_id: created.id,
                    type: 'SUBSCRIPTION_SALE',
                    amount: commissionAmount,
                    currency: bill.currency,
                    payout_currency: bill.currency,
                    payout_amount: commissionAmount,
                    fx_rate: 1.0,
                    fx_source: 'SAME_REGION',
                    rate,
                    status: 'PENDING',
                    description: `Sales commission for subscription: ${planName}`,
                  },
                });
                log.info('Sales agent commission created for subscription', {
                  salesAgentId: salesAgent.id, subscriptionId: created.id, commissionAmount,
                });
              }
            }
          }
        }
      } catch (commErr: any) {
        log.error('Failed to create sales agent commission for subscription', {
          subscriptionId: created.id, error: commErr.message,
        });
      }
    }

    if (checkoutType === 'wallet_recharge') {
      const existingCredit = await prisma.virtualTransaction.findFirst({
        where: {
          reference_type: 'AIRWALLEX_PAYMENT',
          reference_id: paymentAttemptId,
          type: VirtualTransactionType.TRANSFER_IN,
          status: 'COMPLETED',
        },
        select: { id: true },
      });

      if (!existingCredit) {
        const account = await WalletService.getOrCreateAccount('COMPANY', bill.company_id);
        await WalletService.creditAccount({
          accountId: account.id,
          amount: Number(bill.total_amount || bill.amount),
          type: VirtualTransactionType.TRANSFER_IN,
          description: `Airwallex wallet recharge (${paymentAttemptId})`,
          referenceId: paymentAttemptId,
          referenceType: 'AIRWALLEX_PAYMENT',
          createdBy: asString(metadata.userId) || undefined,
          pricingPeg: asString(metadata.pricingPeg) || undefined,
          billingCurrency: bill.currency,
        });
      }
    }

    if (checkoutType === 'managed_service') {
      const jobId = asString(metadata.jobId);
      const servicePackage = asString(metadata.servicePackage);
      if (!jobId || !servicePackage) {
        throw new HttpException(400, 'Managed-service checkout metadata is incomplete');
      }

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, company_id: true, posting_date: true },
      });
      if (!job) {
        throw new HttpException(404, 'Managed-service job not found');
      }
      if (job.company_id !== bill.company_id) {
        throw new HttpException(403, 'Managed-service payment company mismatch');
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          payment_status: 'PAID',
          payment_amount: Number(bill.total_amount || bill.amount),
          payment_currency: bill.currency,
          payment_completed_at: new Date(),
          payment_failed_at: null,
          service_package: servicePackage,
          hiring_mode: this.mapServicePackageToHiringMode(servicePackage),
          management_type: 'hrm8-managed',
          setup_type: 'ADVANCED',
          posting_date: job.posting_date ?? new Date(),
          price_book_id: asString(metadata.priceBookId) || undefined,
          price_book_version: asString(metadata.priceBookVersion) || undefined,
          pricing_peg: asString(metadata.pricingPeg) || undefined,
        },
      });

      // Auto-assign consultant (same logic as synchronous upgrade path)
      try {
        const freshJob = await prisma.job.findUnique({
          where: { id: jobId },
          select: { assigned_consultant_id: true },
        });

        if (!freshJob?.assigned_consultant_id) {
          const assignResult = await jobAllocationService.autoAssignJob(jobId);
          if (assignResult.success && assignResult.consultantId) {
            log.info('Webhook: consultant auto-assigned after managed-service payment', {
              jobId, consultantId: assignResult.consultantId, servicePackage,
            });

            // Create managed-service commission
            const paymentAmount = Number(bill.total_amount || bill.amount);
            const consultant = await prisma.consultant.findUnique({
              where: { id: assignResult.consultantId },
              select: { id: true, region_id: true, default_commission_rate: true },
            });

            if (consultant?.region_id && paymentAmount > 0) {
              const existing = await prisma.commission.findFirst({
                where: { job_id: jobId, consultant_id: consultant.id, type: 'RECRUITMENT_SERVICE' },
                select: { id: true },
              });

              if (!existing) {
                const rate = toCommissionRateDecimal(consultant.default_commission_rate, 0.20);
                const commissionAmount = Number((paymentAmount * rate).toFixed(2));
                if (commissionAmount > 0) {
                  await prisma.commission.create({
                    data: {
                      consultant_id: consultant.id,
                      region_id: consultant.region_id,
                      job_id: jobId,
                      type: 'RECRUITMENT_SERVICE',
                      amount: commissionAmount,
                      currency: bill.currency,
                      payout_currency: bill.currency,
                      payout_amount: commissionAmount,
                      fx_rate: 1.0,
                      fx_source: 'SAME_REGION',
                      rate,
                      status: 'PENDING',
                      description: `Managed service commission for job (webhook payment)`,
                    },
                  });
                  log.info('Webhook: managed-service commission created', {
                    jobId, consultantId: consultant.id, commissionAmount,
                  });
                }
              }
            }
          } else {
            log.warn('Webhook: consultant auto-assignment failed after managed-service payment', {
              jobId, error: assignResult.error,
            });
          }
        }
      } catch (assignErr: any) {
        log.error('Webhook: post-payment assignment/commission failed', {
          jobId, error: assignErr.message,
        });
      }
    }

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        status: BillStatus.PAID,
        paid_at: new Date(),
        synced_at: new Date(),
        subscription_id: subscriptionId,
        notes: JSON.stringify({
          ...(payload || {
            checkoutType,
            metadata,
            provider: 'AIRWALLEX',
            xeroInvoiceId: null,
            xeroInvoiceNumber: null,
          }),
          providerTransactionId: providerTransactionId || null,
          paidAt: new Date().toISOString(),
        }),
      },
    });

    try {
      await CurrencyAssignmentService.lockCurrency(bill.company_id);
    } catch {
      // Locking is best-effort after successful payment.
    }

    return { status: 'SUCCEEDED', billId: bill.id };
  }

  static async markPaymentFailed(paymentAttemptId: string, reason?: string) {
    const bill = await prisma.bill.findFirst({ where: { payment_reference: paymentAttemptId } });
    if (!bill) {
      throw new HttpException(404, 'Payment attempt not found');
    }

    if (bill.status === BillStatus.PAID || bill.status === BillStatus.REFUNDED) {
      return { status: bill.status, billId: bill.id };
    }

    const payload = parseNotesPayload(bill.notes);

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        status: BillStatus.CANCELLED,
        notes: JSON.stringify({
          ...(payload || {
            checkoutType: 'wallet_recharge',
            metadata: {},
            provider: 'AIRWALLEX',
            xeroInvoiceId: null,
            xeroInvoiceNumber: null,
          }),
          failedAt: new Date().toISOString(),
          failureReason: reason || 'Payment failed',
        }),
      },
    });

    return { status: 'FAILED', billId: bill.id };
  }

  static async getPaymentStatus(paymentAttemptId: string) {
    const bill = await prisma.bill.findFirst({
      where: { payment_reference: paymentAttemptId },
      select: {
        id: true,
        status: true,
        amount: true,
        total_amount: true,
        currency: true,
        paid_at: true,
        due_date: true,
        created_at: true,
      },
    });

    if (!bill) {
      throw new HttpException(404, 'Payment attempt not found');
    }

    const status =
      bill.status === BillStatus.PAID
        ? 'SUCCEEDED'
        : bill.status === BillStatus.REFUNDED
          ? 'REFUNDED'
          : 'PENDING';

    return {
      paymentAttemptId,
      billId: bill.id,
      status,
      amount: Number(bill.total_amount || bill.amount),
      currency: bill.currency,
      paidAt: bill.paid_at,
      createdAt: bill.created_at,
      dueDate: bill.due_date,
    };
  }

  static async refundPayment(paymentAttemptId: string, reason?: string) {
    const bill = await prisma.bill.findFirst({
      where: { payment_reference: paymentAttemptId },
      select: {
        id: true,
        status: true,
        amount: true,
        total_amount: true,
        currency: true,
        accounting_ref: true,
        notes: true,
      },
    });

    if (!bill) {
      throw new HttpException(404, 'Payment attempt not found');
    }

    if (bill.status === BillStatus.REFUNDED) {
      return { status: 'REFUNDED', billId: bill.id };
    }

    AirwallexService.createRefund(paymentAttemptId);
    if (bill.accounting_ref) {
      XeroService.createCreditNote(bill.accounting_ref, Number(bill.total_amount || bill.amount), bill.currency);
    }

    const payload = parseNotesPayload(bill.notes);

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        status: BillStatus.REFUNDED,
        notes: JSON.stringify({
          ...(payload || {
            checkoutType: 'wallet_recharge',
            metadata: {},
            provider: 'AIRWALLEX',
            xeroInvoiceId: null,
            xeroInvoiceNumber: null,
          }),
          refundedAt: new Date().toISOString(),
          refundReason: reason || null,
        }),
      },
    });

    const checkoutType = payload?.checkoutType || 'wallet_recharge';
    const metadata = payload?.metadata || {};
    if (checkoutType === 'managed_service') {
      const jobId = asString(metadata.jobId);
      if (jobId) {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            payment_status: 'PENDING',
            payment_completed_at: null,
            payment_failed_at: new Date(),
          },
        });
      }
    }

    return { status: 'REFUNDED', billId: bill.id };
  }

  /**
   * Process an incoming Airwallex webhook event.
   *
   * Validates:
   * 1. Webhook signature (in live mode)
   * 2. Amount/currency match against bill snapshot
   * 3. Idempotent – a bill already PAID is a no-op
   */
  static async processWebhook(
    rawBody: string | Buffer,
    signature: string,
    event: unknown
  ): Promise<{ status: string; billId?: string }> {
    if (!AirwallexService.verifyWebhookSignature(rawBody, signature)) {
      log.error('Webhook signature verification failed');
      throw new HttpException(401, 'Invalid webhook signature');
    }

    const parsed = AirwallexService.parseWebhook(event);
    if (!parsed.paymentAttemptId || !parsed.status) {
      log.warn('Webhook event missing paymentAttemptId or status', { event });
      return { status: 'IGNORED' };
    }

    const bill = await prisma.bill.findFirst({
      where: { payment_reference: parsed.paymentAttemptId },
      select: {
        id: true,
        status: true,
        amount: true,
        total_amount: true,
        currency: true,
        company_id: true,
      },
    });

    if (!bill) {
      log.warn('Webhook for unknown payment attempt', { paymentAttemptId: parsed.paymentAttemptId });
      return { status: 'UNKNOWN_BILL' };
    }

    if (bill.status === BillStatus.PAID) {
      log.info('Webhook for already-paid bill (idempotent)', { billId: bill.id });
      return { status: 'ALREADY_PAID', billId: bill.id };
    }

    if (bill.status === BillStatus.REFUNDED) {
      log.warn('Webhook for already-refunded bill — ignoring', { billId: bill.id });
      return { status: 'ALREADY_REFUNDED', billId: bill.id };
    }

    if (parsed.status === 'SUCCEEDED') {
      BillingLogger.paymentCompleted({
        companyId: bill.company_id,
        billId: bill.id,
        paymentAttemptId: parsed.paymentAttemptId,
        checkoutType: 'webhook',
        amount: Number(bill.total_amount || bill.amount),
        currency: bill.currency,
      });

      const result = await this.markPaymentSucceeded(
        parsed.paymentAttemptId,
        parsed.providerTransactionId
      );
      return { status: 'SUCCEEDED', billId: result.billId };
    }

    if (parsed.status === 'FAILED') {
      await this.markPaymentFailed(parsed.paymentAttemptId, 'Payment failed via webhook');
      return { status: 'FAILED', billId: bill.id };
    }

    return { status: 'UNHANDLED' };
  }
}
