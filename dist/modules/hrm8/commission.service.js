"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionService = void 0;
const service_1 = require("../../core/service");
const client_1 = require("@prisma/client");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
const commission_rate_util_1 = require("./commission-rate.util");
const conversion_commercial_context_service_1 = require("./conversion-commercial-context.service");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('commission');
class CommissionService extends service_1.BaseService {
    constructor(commissionRepository) {
        super();
        this.commissionRepository = commissionRepository;
        this.conversionCommercialContextService = new conversion_commercial_context_service_1.ConversionCommercialContextService();
    }
    mapToDTO(commission) {
        return {
            id: commission.id,
            consultantId: commission.consultant_id,
            regionId: commission.region_id,
            jobId: commission.job_id,
            subscriptionId: commission.subscription_id,
            type: commission.type,
            amount: commission.amount,
            currency: commission.currency || 'USD',
            payoutCurrency: commission.payout_currency || null,
            payoutAmount: commission.payout_amount || null,
            fxRate: commission.fx_rate || null,
            fxRateLockedAt: commission.fx_rate_locked_at || null,
            fxSource: commission.fx_source || null,
            rate: commission.rate || null,
            description: commission.description,
            status: commission.status,
            createdAt: commission.created_at,
            confirmedAt: commission.confirmed_at,
            paidAt: commission.paid_at,
            consultant: commission.consultant ? {
                id: commission.consultant.id,
                firstName: commission.consultant.first_name,
                lastName: commission.consultant.last_name,
                email: commission.consultant.email
            } : undefined
        };
    }
    async resolveCommissionCurrency(params) {
        if (params.jobId) {
            const job = await prisma_1.prisma.job.findUnique({
                where: { id: params.jobId },
                select: { payment_currency: true }
            });
            if (job?.payment_currency) {
                return job.payment_currency;
            }
        }
        if (params.subscriptionId) {
            const subscription = await prisma_1.prisma.subscription.findUnique({
                where: { id: params.subscriptionId },
                select: { currency: true }
            });
            if (subscription?.currency) {
                return subscription.currency;
            }
        }
        return undefined;
    }
    async getAll(params) {
        const { limit = 50, offset = 0, consultantId, regionId, status, commissionType, allowedRegionIds } = params;
        if (allowedRegionIds && allowedRegionIds.length === 0) {
            return { commissions: [], total: 0 };
        }
        const where = {};
        if (consultantId)
            where.consultant_id = consultantId;
        if (regionId)
            where.region_id = regionId;
        if (status)
            where.status = status;
        if (commissionType)
            where.type = commissionType;
        if (allowedRegionIds) {
            if (where.region_id) {
                if (!allowedRegionIds.includes(where.region_id)) {
                    return { commissions: [], total: 0 };
                }
            }
            else {
                where.region_id = { in: allowedRegionIds };
            }
        }
        const [commissions, total] = await Promise.all([
            this.commissionRepository.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: { consultant: true }
            }),
            this.commissionRepository.count(where),
        ]);
        return { commissions: commissions.map(c => this.mapToDTO(c)), total };
    }
    async getById(id, allowedRegionIds) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (allowedRegionIds && !allowedRegionIds.includes(commission.region_id)) {
            throw new http_exception_1.HttpException(403, 'Access denied for this region');
        }
        return this.mapToDTO(commission);
    }
    async getReviewContext(id, allowedRegionIds) {
        const commission = await prisma_1.prisma.commission.findUnique({
            where: { id },
            include: {
                consultant: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        region_id: true
                    }
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                        company_id: true,
                        status: true,
                        setup_type: true,
                        management_type: true,
                        service_package: true,
                        hiring_mode: true,
                        payment_status: true,
                        payment_amount: true,
                        payment_currency: true,
                        posted_at: true,
                        posting_date: true
                    }
                },
                subscription: {
                    select: {
                        id: true,
                        company_id: true,
                        name: true,
                        plan_type: true,
                        base_price: true,
                        currency: true,
                        billing_cycle: true,
                        created_at: true
                    }
                }
            }
        });
        if (!commission) {
            throw new http_exception_1.HttpException(404, 'Commission not found');
        }
        if (allowedRegionIds && !allowedRegionIds.includes(commission.region_id)) {
            throw new http_exception_1.HttpException(403, 'Access denied for this region');
        }
        const companyId = commission.subscription?.company_id || commission.job?.company_id || null;
        const commercialContext = await this.conversionCommercialContextService.buildContextForCompany(companyId, {
            consultantId: commission.consultant_id,
            excludeCommissionId: commission.id,
        });
        const commissionCurrency = await this.resolveCommissionCurrency({
            jobId: commission.job_id,
            subscriptionId: commission.subscription_id
        }) ||
            commercialContext.firstPaymentEvidence?.currency ||
            commercialContext.subscriptionAtFirstJob?.currency ||
            null;
        return {
            commission: {
                id: commission.id,
                consultantId: commission.consultant_id,
                regionId: commission.region_id,
                jobId: commission.job_id,
                subscriptionId: commission.subscription_id,
                type: commission.type,
                amount: commission.amount,
                currency: commissionCurrency,
                status: commission.status,
                description: commission.description || null,
                createdAt: commission.created_at,
                confirmedAt: commission.confirmed_at,
                paidAt: commission.paid_at,
                consultant: commission.consultant ? {
                    id: commission.consultant.id,
                    firstName: commission.consultant.first_name,
                    lastName: commission.consultant.last_name,
                    email: commission.consultant.email,
                    regionId: commission.consultant.region_id
                } : null,
                linkedJob: commission.job ? {
                    id: commission.job.id,
                    title: commission.job.title,
                    setupType: commission.job.setup_type,
                    managementType: commission.job.management_type,
                    servicePackage: commission.job.service_package,
                    hiringMode: commission.job.hiring_mode,
                    paymentStatus: commission.job.payment_status,
                    paymentAmount: commission.job.payment_amount,
                    paymentCurrency: commission.job.payment_currency,
                    postedAt: commission.job.posting_date || commission.job.posted_at || null
                } : null,
                linkedSubscription: commission.subscription ? {
                    id: commission.subscription.id,
                    name: commission.subscription.name,
                    planType: commission.subscription.plan_type,
                    basePrice: commission.subscription.base_price,
                    currency: commission.subscription.currency,
                    billingCycle: commission.subscription.billing_cycle,
                    createdAt: commission.subscription.created_at
                } : null
            },
            companyContext: commercialContext.companyContext,
            conversionContext: {
                request: commercialContext.request ? {
                    id: commercialContext.request.id,
                    status: commercialContext.request.status,
                    company_name: commercialContext.request.company_name,
                    email: commercialContext.request.email,
                    phone: commercialContext.request.phone || null,
                    website: commercialContext.request.website || null,
                    country: commercialContext.request.country,
                    city: commercialContext.request.city || null,
                    region_id: commercialContext.request.region_id,
                    created_at: commercialContext.request.created_at?.toISOString?.() || commercialContext.request.created_at,
                    reviewed_at: commercialContext.request.reviewed_at?.toISOString?.() || commercialContext.request.reviewed_at || null,
                    converted_at: commercialContext.request.converted_at?.toISOString?.() || commercialContext.request.converted_at || null,
                    agent_notes: commercialContext.request.agent_notes || null,
                    intent_snapshot: commercialContext.intentSnapshot
                } : null,
                leadMilestones: commercialContext.leadMilestones,
                conversionMilestones: commercialContext.conversionMilestones,
            },
            commercialEvidence: {
                firstJobEvidence: commercialContext.firstJobEvidence,
                subscriptionAtFirstJob: commercialContext.subscriptionAtFirstJob,
                firstPaymentEvidence: commercialContext.firstPaymentEvidence,
                commissionReadiness: commercialContext.commissionReadiness,
            },
            dataCompleteness: commercialContext.dataCompleteness,
        };
    }
    /**
     * Award commission based on regional pricing
     * Calculates commission from job/subscription payment amount
     */
    async awardCommissionForPayment(consultantId, type, jobId, subscriptionId, customRate) {
        return this.create({
            consultantId,
            type,
            jobId,
            subscriptionId,
            calculateFromJob: true,
            rate: customRate,
        });
    }
    async create(input) {
        const { consultantId, amount: providedAmount, type, jobId, subscriptionId, description, rate, calculateFromJob = false } = input;
        let amount = providedAmount;
        let commissionCurrency = 'USD';
        let commissionRate = (0, commission_rate_util_1.toCommissionRateDecimal)(rate, 0.20);
        if (calculateFromJob && (jobId || subscriptionId)) {
            if (jobId) {
                const job = await prisma_1.prisma.job.findUnique({
                    where: { id: jobId },
                    select: { payment_amount: true, payment_currency: true }
                });
                if (job && job.payment_amount) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = (0, commission_rate_util_1.toCommissionRateDecimal)(rate ?? consultant?.default_commission_rate, 0.20);
                    amount = job.payment_amount * commissionRate;
                    commissionCurrency = job.payment_currency || 'USD';
                }
            }
            else if (subscriptionId) {
                const subscription = await prisma_1.prisma.subscription.findUnique({
                    where: { id: subscriptionId },
                    select: { base_price: true, currency: true }
                });
                if (subscription && subscription.base_price) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = (0, commission_rate_util_1.toCommissionRateDecimal)(rate ?? consultant?.default_commission_rate, 0.20);
                    amount = subscription.base_price * commissionRate;
                    commissionCurrency = subscription.currency || 'USD';
                }
            }
        }
        if (!amount || amount <= 0)
            throw new http_exception_1.HttpException(400, 'Commission amount must be positive');
        return this.commissionRepository.transaction(async (tx) => {
            const consultant = await tx.consultant.findUnique({
                where: { id: consultantId },
                select: { region_id: true, email: true },
            });
            if (!consultant)
                throw new http_exception_1.HttpException(404, 'Consultant not found');
            const commission = await tx.commission.create({
                data: {
                    consultant_id: consultantId,
                    region_id: consultant.region_id,
                    job_id: jobId,
                    subscription_id: subscriptionId,
                    type,
                    amount,
                    currency: commissionCurrency,
                    payout_currency: commissionCurrency,
                    payout_amount: amount,
                    fx_rate: 1.0,
                    fx_source: 'SAME_REGION',
                    rate: commissionRate,
                    description: description || `Commission for ${type}`,
                    status: client_1.CommissionStatus.CONFIRMED,
                    confirmed_at: new Date(),
                },
            });
            let account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });
            if (!account) {
                account = await tx.virtualAccount.create({
                    data: {
                        owner_type: 'CONSULTANT',
                        owner_id: consultantId,
                        balance: 0,
                        status: 'ACTIVE'
                    }
                });
            }
            await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: account.id,
                    type: client_1.VirtualTransactionType.COMMISSION_EARNED,
                    amount,
                    balance_after: Number(account.balance) + amount,
                    direction: 'CREDIT',
                    status: 'COMPLETED',
                    description: `Commission earned: ${description || type}`,
                    reference_id: commission.id,
                    reference_type: 'COMMISSION',
                    commission_id: commission.id,
                    billing_currency_used: commissionCurrency,
                }
            });
            await tx.virtualAccount.update({
                where: { id: account.id },
                data: { balance: { increment: amount }, total_credits: { increment: amount } }
            });
            return commission;
        });
    }
    /**
     * Request commission (consultant-initiated) - creates PENDING, no wallet credit.
     * Admin must confirm to credit VirtualAccount.
     */
    async requestCommission(input) {
        const { consultantId, amount: providedAmount, type, jobId, subscriptionId, description, rate, calculateFromJob = false } = input;
        let amount = providedAmount;
        let commissionCurrency = 'USD';
        let commissionRate = (0, commission_rate_util_1.toCommissionRateDecimal)(rate, 0.20);
        if (calculateFromJob && (jobId || subscriptionId)) {
            if (jobId) {
                const job = await prisma_1.prisma.job.findUnique({
                    where: { id: jobId },
                    select: { payment_amount: true, payment_currency: true }
                });
                if (job?.payment_amount) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = (0, commission_rate_util_1.toCommissionRateDecimal)(rate ?? consultant?.default_commission_rate, 0.20);
                    amount = job.payment_amount * commissionRate;
                    commissionCurrency = job.payment_currency || 'USD';
                }
            }
            else if (subscriptionId) {
                const subscription = await prisma_1.prisma.subscription.findUnique({
                    where: { id: subscriptionId },
                    select: { base_price: true, currency: true }
                });
                if (subscription?.base_price) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = (0, commission_rate_util_1.toCommissionRateDecimal)(rate ?? consultant?.default_commission_rate, 0.20);
                    amount = subscription.base_price * commissionRate;
                    commissionCurrency = subscription.currency || 'USD';
                }
            }
        }
        if (!amount || amount <= 0)
            throw new http_exception_1.HttpException(400, 'Commission amount must be positive');
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { region_id: true }
        });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        if (!consultant.region_id)
            throw new http_exception_1.HttpException(400, 'Consultant must have a region assigned');
        return prisma_1.prisma.commission.create({
            data: {
                consultant_id: consultantId,
                region_id: consultant.region_id,
                job_id: jobId ?? undefined,
                subscription_id: subscriptionId ?? undefined,
                type,
                amount,
                currency: commissionCurrency,
                payout_currency: commissionCurrency,
                payout_amount: amount,
                fx_rate: 1.0,
                fx_source: 'SAME_REGION',
                description: description || `Commission request: ${type}`,
                status: client_1.CommissionStatus.PENDING
            }
        });
    }
    async confirm(id, allowedRegionIds) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (allowedRegionIds && !allowedRegionIds.includes(commission.region_id)) {
            throw new http_exception_1.HttpException(403, 'Access denied for this region');
        }
        if (commission.status === client_1.CommissionStatus.CONFIRMED) {
            return commission;
        }
        if (commission.status !== client_1.CommissionStatus.PENDING) {
            throw new http_exception_1.HttpException(400, `Cannot confirm commission in status ${commission.status}`);
        }
        return this.commissionRepository.transaction(async (tx) => {
            const consultantId = commission.consultant_id;
            const walletAmount = Number(commission.amount);
            const walletCurrency = commission.currency ?? 'USD';
            const description = commission.description || `Commission ${commission.type}`;
            let account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });
            if (!account) {
                account = await tx.virtualAccount.create({
                    data: {
                        owner_type: 'CONSULTANT',
                        owner_id: consultantId,
                        balance: 0,
                        status: 'ACTIVE'
                    }
                });
            }
            const balanceAfter = Number(account.balance) + walletAmount;
            await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: account.id,
                    type: client_1.VirtualTransactionType.COMMISSION_EARNED,
                    amount: walletAmount,
                    balance_after: balanceAfter,
                    direction: 'CREDIT',
                    status: 'COMPLETED',
                    description: `Commission approved: ${description}`,
                    reference_id: commission.id,
                    reference_type: 'COMMISSION',
                    commission_id: commission.id,
                    billing_currency_used: walletCurrency,
                }
            });
            await tx.virtualAccount.update({
                where: { id: account.id },
                data: { balance: { increment: walletAmount }, total_credits: { increment: walletAmount } }
            });
            return tx.commission.update({
                where: { id },
                data: { status: client_1.CommissionStatus.CONFIRMED, confirmed_at: new Date() }
            });
        });
    }
    async markAsPaid(id) {
        return this.commissionRepository.update(id, {
            status: client_1.CommissionStatus.PAID,
            paid_at: new Date()
        });
    }
    async processPayments(ids) {
        // Bulk pay
        await prisma_1.prisma.commission.updateMany({
            where: { id: { in: ids } },
            data: {
                status: client_1.CommissionStatus.PAID,
                paid_at: new Date()
            }
        });
    }
    async getRegional(regionId) {
        return this.commissionRepository.findMany({
            where: { region_id: regionId }
        });
    }
    /**
     * Dispute a commission
     */
    async dispute(id, reason) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        return this.commissionRepository.update(id, {
            status: client_1.CommissionStatus.DISPUTED,
            notes: commission.notes ? `${commission.notes}\n[DISPUTE]: ${reason}` : `[DISPUTE]: ${reason}`
        });
    }
    /**
     * Resolve a commission dispute
     */
    async resolveDispute(id, resolution, notes) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (commission.status !== client_1.CommissionStatus.DISPUTED) {
            throw new http_exception_1.HttpException(400, 'Commission is not disputed');
        }
        const resolutionNote = `[RESOLUTION]: ${resolution} - ${notes || ''}`;
        const updatedNotes = commission.notes ? `${commission.notes}\n${resolutionNote}` : resolutionNote;
        if (resolution === 'VALID') {
            // Restore to previous valid state (default to CONFIRMED if unclear, or check history? simplified: CONFIRMED)
            // If it was PAID, we should probably mark as PAID.
            // For now, let's restore to CONFIRMED as a safe default for active commissions.
            // TODO: Store previous status in metadata if strictness required.
            return this.commissionRepository.update(id, {
                status: client_1.CommissionStatus.CONFIRMED,
                notes: updatedNotes
            });
        }
        else {
            // Invalid commission -> Clawback
            return this.clawback(id, `Dispute resolved as INVALID. ${notes || ''}`);
        }
    }
    /**
     * Clawback (Reverse) a commission
     */
    async clawback(id, reason) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (commission.status === client_1.CommissionStatus.CLAWBACK || commission.status === client_1.CommissionStatus.CANCELLED) {
            throw new http_exception_1.HttpException(400, 'Commission already reversed');
        }
        // If PENDING, just cancel
        if (commission.status === client_1.CommissionStatus.PENDING) {
            return this.commissionRepository.update(id, {
                status: client_1.CommissionStatus.CANCELLED,
                notes: commission.notes ? `${commission.notes}\n[CANCELLED]: ${reason}` : `[CANCELLED]: ${reason}`
            });
        }
        // If CONFIRMED, PAID, or DISPUTED (post-confirm), we need to deduct wallet
        // Use payout_amount (the amount that was actually credited to the wallet)
        return this.commissionRepository.transaction(async (tx) => {
            const walletAmount = Number(commission.amount);
            const walletCurrency = commission.currency ?? 'USD';
            const consultantId = commission.consultant_id;
            const account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });
            if (account) {
                const balanceAfter = Number(account.balance) - walletAmount;
                await tx.virtualTransaction.create({
                    data: {
                        virtual_account_id: account.id,
                        type: client_1.VirtualTransactionType.COMMISSION_CLAWBACK,
                        amount: walletAmount,
                        balance_after: balanceAfter,
                        direction: 'DEBIT',
                        status: 'COMPLETED',
                        description: `Clawback: ${reason}`,
                        reference_id: commission.id,
                        reference_type: 'COMMISSION',
                        commission_id: commission.id,
                        billing_currency_used: walletCurrency,
                    }
                });
                await tx.virtualAccount.update({
                    where: { id: account.id },
                    data: { balance: { decrement: walletAmount } }
                });
            }
            return tx.commission.update({
                where: { id },
                data: {
                    status: client_1.CommissionStatus.CLAWBACK,
                    notes: commission.notes ? `${commission.notes}\n[CLAWBACK]: ${reason}` : `[CLAWBACK]: ${reason}`
                }
            });
        });
    }
}
exports.CommissionService = CommissionService;
