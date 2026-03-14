import { BaseService } from '../../core/service';
import { LeadConversionRepository } from './lead-conversion.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import {
  BillStatus,
  CommissionType,
  ConversionRequestStatus,
  JobStatus,
  TransactionStatus,
  VirtualAccountOwner,
  VirtualTransactionType,
} from '@prisma/client';
import { hashPassword } from '../../utils/password';
import { UserRepository } from '../user/user.repository';
import { passwordResetService } from '../auth/password-reset.service';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';
import { ConversionCommercialContextService } from './conversion-commercial-context.service';
import { FeatureFlags } from '../../config/feature-flags';

type ConversionRequestRecord = any;

interface FirstJobEvidence {
  job_id: string;
  posted_at: string | null;
  setup_type: string | null;
  management_type: string | null;
  service_package: string | null;
  hiring_mode: string | null;
  payment_status: string | null;
}

interface FirstPaymentEvidence {
  source: 'SUBSCRIPTION_BILL' | 'MANAGED_WALLET';
  amount: number;
  currency: string | null;
  paid_at: string;
  reference_id: string | null;
}

interface SubscriptionAtFirstJob {
  subscription_id: string;
  plan_type: string;
  name: string;
  base_price: number;
  currency: string;
  billing_cycle: string;
  created_at: string;
  matchStrategy: 'before_or_equal' | 'after_fallback';
}

interface ConversionCommissionReadiness {
  eligible: boolean;
  reason: string;
  existing_commission_id?: string;
  existing_commission_status?: string;
}

export class LeadConversionService extends BaseService {
  private userRepository: UserRepository;
  private auditLogService: AuditLogService;
  private conversionCommercialContextService: ConversionCommercialContextService;

  constructor(private leadConversionRepository: LeadConversionRepository) {
    super();
    this.userRepository = new UserRepository();
    this.auditLogService = new AuditLogService(new AuditLogRepository());
    this.conversionCommercialContextService = new ConversionCommercialContextService();
  }

  private ensureRegionScope(request: ConversionRequestRecord, regionIds?: string[]) {
    if (!regionIds || regionIds.length === 0) return;
    if (!request.region_id) {
      throw new HttpException(
        403,
        'Conversion request has no region. Regional admins can only approve requests for leads in their assigned region(s).',
        'REQUEST_OUTSIDE_REGION_SCOPE'
      );
    }
    if (!regionIds.includes(request.region_id)) {
      throw new HttpException(
        403,
        'This conversion request is for a lead outside your assigned region(s). You can only approve requests for leads in regions assigned to your licensee. Ensure the lead\'s region is assigned to your licensee in Regions settings.',
        'REQUEST_OUTSIDE_REGION_SCOPE'
      );
    }
  }

  private async resolveFirstJobEvidence(companyId: string): Promise<FirstJobEvidence | null> {
    const postedJob = await prisma.job.findFirst({
      where: {
        company_id: companyId,
        posting_date: { not: null },
      },
      orderBy: [{ posting_date: 'asc' }, { posted_at: 'asc' }, { created_at: 'asc' }],
      select: {
        id: true,
        posting_date: true,
        posted_at: true,
        created_at: true,
        setup_type: true,
        management_type: true,
        service_package: true,
        hiring_mode: true,
        payment_status: true,
      },
    });

    const fallbackJob =
      postedJob ||
      (await prisma.job.findFirst({
        where: {
          company_id: companyId,
          status: { in: [JobStatus.OPEN, JobStatus.CLOSED, JobStatus.FILLED, JobStatus.ON_HOLD] },
        },
        orderBy: [{ posted_at: 'asc' }, { created_at: 'asc' }],
        select: {
          id: true,
          posting_date: true,
          posted_at: true,
          created_at: true,
          setup_type: true,
          management_type: true,
          service_package: true,
          hiring_mode: true,
          payment_status: true,
        },
      }));

    if (!fallbackJob) return null;

    const postedAt = fallbackJob.posting_date || fallbackJob.posted_at || fallbackJob.created_at;

    return {
      job_id: fallbackJob.id,
      posted_at: postedAt ? postedAt.toISOString() : null,
      setup_type: fallbackJob.setup_type || null,
      management_type: fallbackJob.management_type || null,
      service_package: fallbackJob.service_package || null,
      hiring_mode: fallbackJob.hiring_mode || null,
      payment_status: fallbackJob.payment_status || null,
    };
  }

  private async resolveSubscriptionAtFirstJob(
    companyId: string,
    firstJobPostedAt: Date | null
  ): Promise<SubscriptionAtFirstJob | null> {
    if (!firstJobPostedAt) return null;

    let strategy: 'before_or_equal' | 'after_fallback' = 'before_or_equal';
    let subscription = await prisma.subscription.findFirst({
      where: {
        company_id: companyId,
        created_at: { lte: firstJobPostedAt },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        plan_type: true,
        name: true,
        base_price: true,
        currency: true,
        billing_cycle: true,
        created_at: true,
      },
    });

    if (!subscription) {
      strategy = 'after_fallback';
      subscription = await prisma.subscription.findFirst({
        where: {
          company_id: companyId,
          created_at: { gt: firstJobPostedAt },
        },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          plan_type: true,
          name: true,
          base_price: true,
          currency: true,
          billing_cycle: true,
          created_at: true,
        },
      });
    }

    if (!subscription) return null;

    return {
      subscription_id: subscription.id,
      plan_type: subscription.plan_type,
      name: subscription.name,
      base_price: subscription.base_price,
      currency: subscription.currency,
      billing_cycle: subscription.billing_cycle,
      created_at: subscription.created_at.toISOString(),
      matchStrategy: strategy,
    };
  }

  private async resolveFirstPaymentEvidence(companyId: string): Promise<FirstPaymentEvidence | null> {
    const [paidBill, managedWalletDebit] = await Promise.all([
      prisma.bill.findFirst({
        where: {
          company_id: companyId,
          status: BillStatus.PAID,
          paid_at: { not: null },
        },
        orderBy: [{ paid_at: 'asc' }, { created_at: 'asc' }],
        select: {
          id: true,
          total_amount: true,
          amount: true,
          currency: true,
          paid_at: true,
          created_at: true,
        },
      }),
      prisma.virtualTransaction.findFirst({
        where: {
          virtual_account: {
            owner_type: VirtualAccountOwner.COMPANY,
            owner_id: companyId,
          },
          type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
          status: TransactionStatus.COMPLETED,
          reference_type: 'JOB',
        },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          amount: true,
          created_at: true,
          reference_id: true,
          billing_currency_used: true,
          metadata: true,
        },
      }),
    ]);

    const billPaidAt = paidBill?.paid_at || paidBill?.created_at || null;
    const walletPaidAt = managedWalletDebit?.created_at || null;

    if (!billPaidAt && !walletPaidAt) return null;

    if (billPaidAt && (!walletPaidAt || billPaidAt.getTime() <= walletPaidAt.getTime())) {
      return {
        source: 'SUBSCRIPTION_BILL',
        amount: paidBill?.total_amount ?? paidBill?.amount ?? 0,
        currency: paidBill?.currency || null,
        paid_at: billPaidAt.toISOString(),
        reference_id: paidBill?.id || null,
      };
    }

    const metadataCurrency =
      managedWalletDebit?.metadata &&
      typeof managedWalletDebit.metadata === 'object' &&
      !Array.isArray(managedWalletDebit.metadata)
        ? ((managedWalletDebit.metadata as Record<string, unknown>).currency as string | undefined)
        : undefined;

    return {
      source: 'MANAGED_WALLET',
      amount: managedWalletDebit?.amount ?? 0,
      currency: managedWalletDebit?.billing_currency_used || metadataCurrency || null,
      paid_at: walletPaidAt!.toISOString(),
      reference_id: managedWalletDebit?.reference_id || managedWalletDebit?.id || null,
    };
  }

  private async hasFirstPaymentEvidence(companyId: string): Promise<boolean> {
    const firstPayment = await this.resolveFirstPaymentEvidence(companyId);
    return Boolean(firstPayment);
  }

  private async resolveCommissionReadiness(
    request: ConversionRequestRecord,
    firstPayment: FirstPaymentEvidence | null
  ): Promise<ConversionCommissionReadiness> {
    if (!request.company_id) {
      return { eligible: false, reason: 'Company not converted yet' };
    }

    if (request.status !== 'APPROVED' && request.status !== 'CONVERTED') {
      return { eligible: false, reason: `Request is ${request.status}` };
    }

    if (!request.consultant_id) {
      return { eligible: false, reason: 'No consultant attribution found' };
    }

    const existingCommission = await prisma.commission.findFirst({
      where: {
        consultant_id: request.consultant_id,
        type: CommissionType.SUBSCRIPTION_SALE,
        subscription: {
          company_id: request.company_id,
        },
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingCommission) {
      return {
        eligible: false,
        reason: 'Commission already created for this converted company',
        existing_commission_id: existingCommission.id,
        existing_commission_status: existingCommission.status,
      };
    }

    if (!firstPayment) {
      return { eligible: false, reason: 'Waiting for first successful payment' };
    }

    return { eligible: true, reason: 'Eligible after first successful payment event' };
  }

  async getAll(filters: { status?: ConversionRequestStatus; regionIds?: string[] }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.regionIds && filters.regionIds.length > 0) {
      where.region_id = { in: filters.regionIds };
    }

    const requests = await this.leadConversionRepository.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const enriched = await Promise.all(
      requests.map(async (request: ConversionRequestRecord) => ({
        ...request,
        lead_confirmed_at: request.lead?.validated_at || null,
        has_company: Boolean(request.company_id),
        has_first_payment: request.company_id
          ? await this.hasFirstPaymentEvidence(request.company_id)
          : false,
      }))
    );

    return enriched;
  }

  async getOne(id: string, regionIds?: string[]) {
    const request = await this.leadConversionRepository.findUnique(id);
    if (!request) throw new HttpException(404, 'Conversion request not found');
    this.ensureRegionScope(request, regionIds);
    return request;
  }

  async getReviewContext(id: string, regionIds?: string[]) {
    const request = await this.getOne(id, regionIds);
    const context = await this.conversionCommercialContextService.buildContextForConversionRequest(request);

    return {
      request: {
        id: request.id,
        status: request.status,
        company_name: request.company_name,
        email: request.email,
        phone: request.phone || null,
        website: request.website || null,
        country: request.country,
        city: request.city || null,
        region_id: request.region_id,
        created_at: request.created_at?.toISOString?.() || request.created_at,
        reviewed_at: request.reviewed_at?.toISOString?.() || request.reviewed_at || null,
        converted_at: request.converted_at?.toISOString?.() || request.converted_at || null,
        agent_notes: request.agent_notes || null,
        intent_snapshot: context.intentSnapshot,
      },
      leadMilestones: context.leadMilestones,
      conversionMilestones: context.conversionMilestones,
      firstJobEvidence: context.firstJobEvidence,
      subscriptionAtFirstJob: context.subscriptionAtFirstJob,
      firstPaymentEvidence: context.firstPaymentEvidence,
      commissionReadiness: context.commissionReadiness,
      dataCompleteness: context.dataCompleteness,
      companyContext: context.companyContext,
    };
  }

  async approve(
    id: string,
    admin: { id: string; email: string; role: string },
    adminNotes?: string,
    metadata?: { ip?: string; userAgent?: string },
    regionIds?: string[]
  ) {
    const request = await this.getOne(id, regionIds);
    if (request.status !== 'PENDING') {
      throw new HttpException(400, `Request cannot be approved in ${request.status} status`);
    }

    let mapping: { pricingPeg: string; billingCurrency: string; countryCode: string } | null = null;
    if (FeatureFlags.FF_STRICT_REGION_CURRENCY_GATE) {
      if (!request.region_id) {
        throw new HttpException(422, 'Conversion request has no region; cannot resolve currency mapping', 'REGION_CURRENCY_MAPPING_MISSING');
      }
      const result = await CurrencyAssignmentService.resolveRegionCurrencyOrThrow(request.region_id);
      mapping = {
        pricingPeg: result.pricingPeg,
        billingCurrency: result.billingCurrency,
        countryCode: result.countryCode,
      };
    }

    const tempPassword = request.temp_password || require('crypto').randomBytes(12).toString('base64url');
    const baseDomain = request.website
      ? request.website.replace(/^https?:\/\//, '').split('/')[0].replace(/\./g, '-')
      : 'company';
    const domain = `${baseDomain}-${request.lead_id}.local`;

    // If 360 consultant converted, they become the default consultant for HRM8 managed jobs
    const consultant = await prisma.consultant.findUnique({
      where: { id: request.consultant_id },
      select: { role: true },
    });
    const is360Conversion = consultant?.role === 'CONSULTANT_360';

    const companyCreateData: Record<string, unknown> = {
      name: request.company_name,
      domain,
      website: request.website || '',
      region_id: request.region_id,
      country_or_region: request.country,
      sales_agent_id: request.consultant_id,
      ...(is360Conversion && { default_consultant_id: request.consultant_id }),
    };
    if (mapping) {
      (companyCreateData as any).pricing_peg = mapping.pricingPeg;
      (companyCreateData as any).billing_currency = mapping.billingCurrency;
      (companyCreateData as any).country = mapping.countryCode.toUpperCase();
      (companyCreateData as any).currency_locked_at = new Date();
    }

    const { updatedRequest, company, userId } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: companyCreateData as any,
      });

      await tx.lead.update({
        where: { id: request.lead_id },
        data: {
          status: 'CONVERTED',
          converted_to_company_id: company.id,
          converted_at: new Date(),
        },
      });

      const updatedRequest = await tx.leadConversionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewed_by: admin.id,
          reviewed_at: new Date(),
          admin_notes: adminNotes,
          company_id: company.id,
          converted_at: new Date(),
        },
        select: {
          id: true,
          lead_id: true,
          consultant_id: true,
          region_id: true,
          status: true,
          company_name: true,
          email: true,
          phone: true,
          website: true,
          country: true,
          city: true,
          state_province: true,
          agent_notes: true,
          reviewed_by: true,
          reviewed_at: true,
          admin_notes: true,
          decline_reason: true,
          converted_at: true,
          company_id: true,
          created_at: true,
          updated_at: true,
          temp_password: true,
        },
      });

      const existingUser = await this.userRepository.findByEmail(request.email);
      let userId = existingUser?.id;
      if (!existingUser) {
        const passwordHash = await hashPassword(tempPassword);
        const newUser = await tx.user.create({
          data: {
            email: request.email,
            name: `${request.company_name} Admin`,
            password_hash: passwordHash,
            company_id: company.id,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });
        userId = newUser.id;
      }
      return { updatedRequest, company, userId };
    });

    if (!mapping) {
      try {
        const countryCode = await CurrencyAssignmentService.resolveCountryCode(
          request.country,
          request.region_id
        );
        if (countryCode) {
          await CurrencyAssignmentService.assignCurrencyToCompany(company.id, countryCode);
        }
      } catch (err) {
        console.warn(`[LeadConversion] Could not assign currency for company ${company.id}:`, err);
      }
    }

    if (request.email) {
      await passwordResetService.requestLeadConversionInvite(
        request.email,
        company.name,
        {
          ip: metadata?.ip,
          userAgent: metadata?.userAgent,
        }
      );
    }

    await this.auditLogService.log({
      entityType: 'lead_conversion_request',
      entityId: updatedRequest.id,
      action: 'LEAD_CONVERSION_APPROVED',
      performedBy: admin.id,
      performedByEmail: admin.email,
      performedByRole: admin.role,
      changes: {
        leadId: request.lead_id,
        companyId: company.id,
        userId,
      },
      ipAddress: metadata?.ip,
      userAgent: metadata?.userAgent,
      description: `Approved lead conversion for ${request.company_name}`,
    });

    return { request: updatedRequest, company, inviteSent: Boolean(request.email) };
  }

  async decline(
    id: string,
    admin: { id: string; email: string; role: string },
    declineReason: string,
    metadata?: { ip?: string; userAgent?: string },
    regionIds?: string[]
  ) {
    const request = await this.getOne(id, regionIds);
    if (request.status !== 'PENDING') {
      throw new HttpException(400, `Request cannot be declined in ${request.status} status`);
    }

    const updated = await this.leadConversionRepository.update(id, {
      status: 'DECLINED',
      reviewer: { connect: { id: admin.id } },
      reviewed_at: new Date(),
      decline_reason: declineReason,
    });

    await this.auditLogService.log({
      entityType: 'lead_conversion_request',
      entityId: updated.id,
      action: 'LEAD_CONVERSION_DECLINED',
      performedBy: admin.id,
      performedByEmail: admin.email,
      performedByRole: admin.role,
      changes: {
        leadId: updated.lead_id,
        declineReason,
      },
      ipAddress: metadata?.ip,
      userAgent: metadata?.userAgent,
      description: `Declined lead conversion for ${updated.company_name}`,
    });

    return updated;
  }
}
