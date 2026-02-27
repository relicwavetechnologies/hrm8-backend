"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionCommercialContextService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
const conversionRequestContextSelect = {
    id: true,
    status: true,
    lead_id: true,
    consultant_id: true,
    region_id: true,
    company_name: true,
    email: true,
    phone: true,
    website: true,
    country: true,
    city: true,
    state_province: true,
    agent_notes: true,
    reviewed_at: true,
    converted_at: true,
    company_id: true,
    created_at: true,
    intent_snapshot: true,
    lead: {
        select: {
            id: true,
            status: true,
            lead_source: true,
            created_at: true,
            validated_at: true,
        },
    },
    company: {
        select: {
            id: true,
            name: true,
            website: true,
            billing_currency: true,
            pricing_peg: true,
            created_at: true,
        },
    },
};
const conversionRequestContextSelectWithoutIntentSnapshot = {
    id: true,
    status: true,
    lead_id: true,
    consultant_id: true,
    region_id: true,
    company_name: true,
    email: true,
    phone: true,
    website: true,
    country: true,
    city: true,
    state_province: true,
    agent_notes: true,
    reviewed_at: true,
    converted_at: true,
    company_id: true,
    created_at: true,
    lead: {
        select: {
            id: true,
            status: true,
            lead_source: true,
            created_at: true,
            validated_at: true,
        },
    },
    company: {
        select: {
            id: true,
            name: true,
            website: true,
            billing_currency: true,
            pricing_peg: true,
            created_at: true,
        },
    },
};
const isIntentSnapshotColumnMissing = (error) => {
    const err = error;
    return err?.code === 'P2022' && String(err?.meta?.column || '').includes('intent_snapshot');
};
const toIso = (value) => {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const asNumber = (value) => {
    if (value === null || value === undefined)
        return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
class ConversionCommercialContextService {
    extractIntentSnapshotFromNotes(agentNotes) {
        if (!agentNotes)
            return null;
        const marker = '[Intent Snapshot]';
        const markerIndex = agentNotes.lastIndexOf(marker);
        if (markerIndex < 0)
            return null;
        const payload = agentNotes.slice(markerIndex + marker.length).trim();
        if (!payload)
            return null;
        const parseCandidate = (candidate) => {
            try {
                const parsed = JSON.parse(candidate);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    return null;
                }
                return parsed;
            }
            catch {
                return null;
            }
        };
        const directParsed = parseCandidate(payload);
        if (directParsed)
            return directParsed;
        const objectStart = payload.indexOf('{');
        const objectEnd = payload.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            const sliced = payload.slice(objectStart, objectEnd + 1);
            return parseCandidate(sliced);
        }
        return null;
    }
    resolveIntentSnapshot(request) {
        const rawIntent = request.intent_snapshot;
        if (rawIntent && typeof rawIntent === 'object' && !Array.isArray(rawIntent)) {
            return rawIntent;
        }
        return this.extractIntentSnapshotFromNotes(request.agent_notes);
    }
    async resolveFirstJobEvidence(companyId) {
        const postedJob = await prisma_1.prisma.job.findFirst({
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
        const fallbackJob = postedJob ||
            (await prisma_1.prisma.job.findFirst({
                where: {
                    company_id: companyId,
                    status: { in: [client_1.JobStatus.OPEN, client_1.JobStatus.CLOSED, client_1.JobStatus.FILLED, client_1.JobStatus.ON_HOLD] },
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
        if (!fallbackJob)
            return null;
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
    async resolveSubscriptionAtFirstJob(companyId, firstJobPostedAt) {
        if (!firstJobPostedAt)
            return null;
        let strategy = 'before_or_equal';
        let subscription = await prisma_1.prisma.subscription.findFirst({
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
            subscription = await prisma_1.prisma.subscription.findFirst({
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
        if (!subscription)
            return null;
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
    async resolveFirstPaymentEvidence(companyId) {
        const [paidBill, managedWalletDebit] = await Promise.all([
            prisma_1.prisma.bill.findFirst({
                where: {
                    company_id: companyId,
                    status: client_1.BillStatus.PAID,
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
            prisma_1.prisma.virtualTransaction.findFirst({
                where: {
                    virtual_account: {
                        owner_type: client_1.VirtualAccountOwner.COMPANY,
                        owner_id: companyId,
                    },
                    type: client_1.VirtualTransactionType.JOB_POSTING_DEDUCTION,
                    status: client_1.TransactionStatus.COMPLETED,
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
        if (!billPaidAt && !walletPaidAt)
            return null;
        if (billPaidAt && (!walletPaidAt || billPaidAt.getTime() <= walletPaidAt.getTime())) {
            return {
                source: 'SUBSCRIPTION_BILL',
                amount: asNumber(paidBill?.total_amount ?? paidBill?.amount),
                currency: paidBill?.currency || null,
                paid_at: billPaidAt.toISOString(),
                reference_id: paidBill?.id || null,
            };
        }
        const metadataCurrency = managedWalletDebit?.metadata &&
            typeof managedWalletDebit.metadata === 'object' &&
            !Array.isArray(managedWalletDebit.metadata)
            ? managedWalletDebit.metadata.currency
            : undefined;
        return {
            source: 'MANAGED_WALLET',
            amount: asNumber(managedWalletDebit?.amount),
            currency: managedWalletDebit?.billing_currency_used || metadataCurrency || null,
            paid_at: walletPaidAt.toISOString(),
            reference_id: managedWalletDebit?.reference_id || managedWalletDebit?.id || null,
        };
    }
    async resolveCommissionReadiness(params) {
        const { companyId, consultantId, requestStatus, firstPayment, excludeCommissionId } = params;
        if (!companyId) {
            return { eligible: false, reason: 'Company not converted yet' };
        }
        if (requestStatus && requestStatus !== 'APPROVED' && requestStatus !== 'CONVERTED') {
            return { eligible: false, reason: `Request is ${requestStatus}` };
        }
        if (!consultantId) {
            return { eligible: false, reason: 'No consultant attribution found' };
        }
        const existingCommission = await prisma_1.prisma.commission.findFirst({
            where: {
                consultant_id: consultantId,
                type: client_1.CommissionType.SUBSCRIPTION_SALE,
                subscription: { company_id: companyId },
                ...(excludeCommissionId ? { id: { not: excludeCommissionId } } : {}),
            },
            orderBy: { created_at: 'asc' },
            select: { id: true, status: true },
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
    async getLatestConversionRequestByCompany(companyId) {
        try {
            return await prisma_1.prisma.leadConversionRequest.findFirst({
                where: { company_id: companyId },
                orderBy: [{ converted_at: 'desc' }, { created_at: 'desc' }],
                select: conversionRequestContextSelect,
            });
        }
        catch (error) {
            if (!isIntentSnapshotColumnMissing(error))
                throw error;
            return prisma_1.prisma.leadConversionRequest.findFirst({
                where: { company_id: companyId },
                orderBy: [{ converted_at: 'desc' }, { created_at: 'desc' }],
                select: conversionRequestContextSelectWithoutIntentSnapshot,
            });
        }
    }
    async getCompanyContext(companyId) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                website: true,
                billing_currency: true,
                pricing_peg: true,
                created_at: true,
            },
        });
        if (!company)
            return null;
        return {
            id: company.id,
            name: company.name,
            website: company.website || null,
            billing_currency: company.billing_currency || null,
            pricing_peg: company.pricing_peg || null,
            created_at: toIso(company.created_at),
        };
    }
    async buildContextForConversionRequest(request) {
        const companyId = request.company_id || null;
        return this.buildContextForCompany(companyId, {
            request,
            consultantId: request.consultant_id,
            requestStatus: request.status,
        });
    }
    async buildContextForCompany(companyId, options) {
        const request = options?.request ?? (companyId ? await this.getLatestConversionRequestByCompany(companyId) : null);
        const consultantId = options?.consultantId ?? request?.consultant_id ?? null;
        const requestStatus = options?.requestStatus ?? request?.status ?? null;
        const firstJobEvidence = companyId ? await this.resolveFirstJobEvidence(companyId) : null;
        const firstJobPostedAt = firstJobEvidence?.posted_at ? new Date(firstJobEvidence.posted_at) : null;
        const subscriptionAtFirstJob = companyId ? await this.resolveSubscriptionAtFirstJob(companyId, firstJobPostedAt) : null;
        const firstPaymentEvidence = companyId ? await this.resolveFirstPaymentEvidence(companyId) : null;
        const commissionReadiness = await this.resolveCommissionReadiness({
            companyId,
            consultantId,
            requestStatus,
            firstPayment: firstPaymentEvidence,
            excludeCommissionId: options?.excludeCommissionId,
        });
        const leadMilestones = {
            lead_created_at: toIso(request?.lead?.created_at),
            lead_confirmed_at: toIso(request?.lead?.validated_at),
            lead_status: request?.lead?.status || null,
            lead_source: request?.lead?.lead_source || null,
        };
        const conversionMilestones = {
            request_submitted_at: toIso(request?.created_at),
            reviewed_at: toIso(request?.reviewed_at),
            converted_at: toIso(request?.converted_at),
        };
        const preApprovalComplete = Boolean(request?.company_name &&
            request?.email &&
            request?.country &&
            request?.region_id &&
            request?.lead_id);
        const companyContext = request?.company
            ? {
                id: request.company.id,
                name: request.company.name,
                website: request.company.website || null,
                billing_currency: request.company.billing_currency || null,
                pricing_peg: request.company.pricing_peg || null,
                created_at: toIso(request.company.created_at),
            }
            : companyId
                ? await this.getCompanyContext(companyId)
                : null;
        return {
            request,
            intentSnapshot: this.resolveIntentSnapshot(request || {}),
            leadMilestones,
            conversionMilestones,
            firstJobEvidence,
            subscriptionAtFirstJob,
            firstPaymentEvidence,
            commissionReadiness,
            dataCompleteness: {
                preApprovalComplete,
                postPaymentAvailable: Boolean(firstPaymentEvidence),
            },
            companyContext,
        };
    }
}
exports.ConversionCommercialContextService = ConversionCommercialContextService;
