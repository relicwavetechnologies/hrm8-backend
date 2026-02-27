"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalCompanyService = void 0;
const service_1 = require("../../core/service");
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const price_book_selection_service_1 = require("../pricing/price-book-selection.service");
const conversion_commercial_context_service_1 = require("./conversion-commercial-context.service");
class RegionalCompanyService extends service_1.BaseService {
    constructor() {
        super(...arguments);
        this.conversionContextService = new conversion_commercial_context_service_1.ConversionCommercialContextService();
    }
    normalizeDate(value, fallback) {
        if (!value)
            return fallback;
        const parsed = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new http_exception_1.HttpException(400, 'Invalid date value');
        }
        return parsed;
    }
    async assertCompanyAccess(companyId, options, select) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                region_id: true,
                ...select,
            },
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        if (options.role === 'REGIONAL_LICENSEE') {
            const assignedRegionIds = options.assignedRegionIds || [];
            if (!assignedRegionIds.length) {
                throw new http_exception_1.HttpException(403, 'Regional admin has no assigned region');
            }
            if (!company.region_id || !assignedRegionIds.includes(company.region_id)) {
                throw new http_exception_1.HttpException(403, 'Access denied for this company');
            }
        }
        return company;
    }
    async listCompanies(options) {
        const page = options.page && options.page > 0 ? options.page : 1;
        const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (options.role === 'REGIONAL_LICENSEE') {
            const assignedRegionIds = options.assignedRegionIds || [];
            if (!assignedRegionIds.length) {
                return { companies: [], pagination: { page, limit, total: 0, totalPages: 0 } };
            }
            where.region_id = { in: assignedRegionIds };
        }
        if (options.search?.trim()) {
            const query = options.search.trim();
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { domain: { contains: query, mode: 'insensitive' } },
                { website: { contains: query, mode: 'insensitive' } },
            ];
        }
        const status = (options.status || '').toUpperCase();
        if (status === 'ACTIVE') {
            where.jobs = { some: { status: 'OPEN' } };
        }
        else if (status === 'INACTIVE') {
            where.jobs = { none: { status: 'OPEN' } };
        }
        else if (status === 'NEW') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            where.created_at = { gte: startOfMonth };
        }
        const [companies, total] = await Promise.all([
            prisma_1.prisma.company.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    website: true,
                    domain: true,
                    country_or_region: true,
                    region_id: true,
                    attribution_locked: true,
                    attribution_locked_at: true,
                    billing_currency: true,
                    pricing_peg: true,
                    currency_locked_at: true,
                    created_at: true,
                    updated_at: true,
                    region: {
                        select: {
                            id: true,
                            name: true,
                            country: true,
                        },
                    },
                    _count: {
                        select: {
                            jobs: {
                                where: { status: 'OPEN' },
                            },
                            users: true,
                        },
                    },
                    subscription: {
                        where: { status: 'ACTIVE' },
                        take: 1,
                        orderBy: { created_at: 'desc' },
                        select: {
                            id: true,
                            name: true,
                            plan_type: true,
                            status: true,
                            start_date: true,
                            renewal_date: true,
                            job_quota: true,
                            jobs_used: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.company.count({ where }),
        ]);
        return {
            companies: companies.map((company) => ({
                ...company,
                attribution_status: company.attribution_locked ? 'LOCKED' : 'OPEN',
                open_jobs_count: company._count.jobs,
                users_count: company._count.users,
                subscription: company.subscription[0] || null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getById(id, options) {
        await this.assertCompanyAccess(id, options || {}, { region_id: true });
        const company = await prisma_1.prisma.company.findUnique({
            where: { id },
            include: {
                subscription: {
                    orderBy: { created_at: 'desc' },
                    take: 5,
                },
                region: true,
                price_book: true,
            },
        });
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return { company };
    }
    async getOverview(companyId, options) {
        await this.assertCompanyAccess(companyId, options, { region_id: true });
        const [company, openJobsCount, totalJobsCount, applicationsCount, activeSubscription, wallet, commercialContext] = await Promise.all([
            prisma_1.prisma.company.findUnique({
                where: { id: companyId },
                include: {
                    region: true,
                    price_book: true,
                },
            }),
            prisma_1.prisma.job.count({
                where: {
                    company_id: companyId,
                    status: 'OPEN',
                },
            }),
            prisma_1.prisma.job.count({
                where: { company_id: companyId },
            }),
            prisma_1.prisma.application.count({
                where: {
                    job: {
                        company_id: companyId,
                    },
                },
            }),
            prisma_1.prisma.subscription.findFirst({
                where: {
                    company_id: companyId,
                    status: 'ACTIVE',
                },
                orderBy: { created_at: 'desc' },
            }),
            prisma_1.prisma.virtualAccount.findUnique({
                where: {
                    owner_type_owner_id: {
                        owner_type: 'COMPANY',
                        owner_id: companyId,
                    },
                },
                select: {
                    id: true,
                    balance: true,
                    total_credits: true,
                    total_debits: true,
                    status: true,
                },
            }),
            this.conversionContextService.buildContextForCompany(companyId),
        ]);
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        const usersCount = await prisma_1.prisma.user.count({ where: { company_id: companyId } });
        return {
            company: {
                id: company.id,
                name: company.name,
                website: company.website,
                domain: company.domain,
                country_or_region: company.country_or_region,
                country: company.country,
                billing_currency: company.billing_currency,
                pricing_peg: company.pricing_peg,
                currency_locked_at: company.currency_locked_at,
                attribution_locked: company.attribution_locked,
                attribution_locked_at: company.attribution_locked_at,
                created_at: company.created_at,
                updated_at: company.updated_at,
                region: company.region,
                price_book: company.price_book,
            },
            stats: {
                open_jobs_count: openJobsCount,
                total_jobs_count: totalJobsCount,
                applications_count: applicationsCount,
                users_count: usersCount,
            },
            activeSubscription,
            wallet,
            commercialEvidence: {
                leadMilestones: commercialContext.leadMilestones,
                conversionMilestones: commercialContext.conversionMilestones,
                firstJobEvidence: commercialContext.firstJobEvidence,
                subscriptionAtFirstJob: commercialContext.subscriptionAtFirstJob,
                firstPaymentEvidence: commercialContext.firstPaymentEvidence,
                commissionReadiness: commercialContext.commissionReadiness,
            },
            dataCompleteness: commercialContext.dataCompleteness,
        };
    }
    async getActivity(companyId, options) {
        await this.assertCompanyAccess(companyId, options, { region_id: true });
        const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50;
        const [jobs, subscriptions, bills, wallet, commissions, conversionRequests, overrides] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where: { company_id: companyId },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    hiring_mode: true,
                    service_package: true,
                    setup_type: true,
                    payment_status: true,
                    payment_amount: true,
                    payment_currency: true,
                    created_at: true,
                    posted_at: true,
                    payment_completed_at: true,
                },
            }),
            prisma_1.prisma.subscription.findMany({
                where: { company_id: companyId },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: {
                    id: true,
                    name: true,
                    plan_type: true,
                    status: true,
                    base_price: true,
                    currency: true,
                    created_at: true,
                    start_date: true,
                    renewal_date: true,
                },
            }),
            prisma_1.prisma.bill.findMany({
                where: { company_id: companyId },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: {
                    id: true,
                    bill_number: true,
                    amount: true,
                    total_amount: true,
                    currency: true,
                    status: true,
                    due_date: true,
                    paid_at: true,
                    created_at: true,
                    payment_reference: true,
                    subscription_id: true,
                },
            }),
            prisma_1.prisma.virtualAccount.findUnique({
                where: {
                    owner_type_owner_id: {
                        owner_type: 'COMPANY',
                        owner_id: companyId,
                    },
                },
                select: {
                    id: true,
                    transactions: {
                        orderBy: { created_at: 'desc' },
                        take: limit,
                        select: {
                            id: true,
                            type: true,
                            amount: true,
                            direction: true,
                            status: true,
                            description: true,
                            reference_type: true,
                            reference_id: true,
                            billing_currency_used: true,
                            created_at: true,
                            failed_reason: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.commission.findMany({
                where: {
                    OR: [
                        { job: { company_id: companyId } },
                        { subscription: { company_id: companyId } },
                    ],
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    status: true,
                    consultant_id: true,
                    created_at: true,
                    confirmed_at: true,
                    paid_at: true,
                    job_id: true,
                    subscription_id: true,
                },
            }),
            prisma_1.prisma.leadConversionRequest.findMany({
                where: {
                    OR: [{ company_id: companyId }],
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: {
                    id: true,
                    status: true,
                    company_name: true,
                    created_at: true,
                    reviewed_at: true,
                    converted_at: true,
                    email: true,
                },
            }),
            prisma_1.prisma.enterpriseOverride.findMany({
                where: { company_id: companyId },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: {
                    id: true,
                    is_active: true,
                    scope: true,
                    notes: true,
                    created_at: true,
                    effective_from: true,
                    effective_to: true,
                    created_by: true,
                    approved_by: true,
                    price_book_id: true,
                },
            }),
        ]);
        const events = [
            ...jobs.map((job) => ({
                id: `job:${job.id}`,
                entityId: job.id,
                entityType: 'JOB',
                type: 'JOB_EVENT',
                occurredAt: job.payment_completed_at || job.posted_at || job.created_at,
                title: `Job ${job.status === 'OPEN' ? 'Opened' : 'Updated'}`,
                description: `${job.title} (${job.hiring_mode})`,
                metadata: {
                    status: job.status,
                    hiring_mode: job.hiring_mode,
                    service_package: job.service_package,
                    setup_type: job.setup_type,
                    payment_status: job.payment_status,
                    payment_amount: job.payment_amount,
                    payment_currency: job.payment_currency,
                },
            })),
            ...subscriptions.map((subscription) => ({
                id: `subscription:${subscription.id}`,
                entityId: subscription.id,
                entityType: 'SUBSCRIPTION',
                type: 'SUBSCRIPTION_EVENT',
                occurredAt: subscription.created_at,
                title: `Subscription ${subscription.status}`,
                description: `${subscription.name} (${subscription.plan_type})`,
                metadata: {
                    status: subscription.status,
                    plan_type: subscription.plan_type,
                    base_price: subscription.base_price,
                    currency: subscription.currency,
                    start_date: subscription.start_date,
                    renewal_date: subscription.renewal_date,
                },
            })),
            ...bills.map((bill) => ({
                id: `bill:${bill.id}`,
                entityId: bill.id,
                entityType: 'BILL',
                type: 'BILL_EVENT',
                occurredAt: bill.paid_at || bill.created_at,
                title: `Bill ${bill.status}`,
                description: `${bill.bill_number}`,
                metadata: {
                    status: bill.status,
                    amount: bill.amount,
                    total_amount: bill.total_amount,
                    currency: bill.currency,
                    paid_at: bill.paid_at,
                    due_date: bill.due_date,
                    payment_reference: bill.payment_reference,
                    subscription_id: bill.subscription_id,
                },
            })),
            ...(wallet?.transactions || []).map((tx) => ({
                id: `wallet:${tx.id}`,
                entityId: tx.id,
                entityType: 'WALLET_TRANSACTION',
                type: 'WALLET_EVENT',
                occurredAt: tx.created_at,
                title: `Wallet ${tx.direction === 'CREDIT' ? 'Credit' : 'Debit'} ${tx.status}`,
                description: tx.description || tx.type,
                metadata: {
                    type: tx.type,
                    amount: tx.amount,
                    direction: tx.direction,
                    status: tx.status,
                    currency: tx.billing_currency_used,
                    reference_type: tx.reference_type,
                    reference_id: tx.reference_id,
                    failed_reason: tx.failed_reason,
                },
            })),
            ...commissions.map((commission) => ({
                id: `commission:${commission.id}`,
                entityId: commission.id,
                entityType: 'COMMISSION',
                type: 'COMMISSION_EVENT',
                occurredAt: commission.paid_at || commission.confirmed_at || commission.created_at,
                title: `Commission ${commission.status}`,
                description: `${commission.type} commission`,
                metadata: {
                    status: commission.status,
                    type: commission.type,
                    amount: commission.amount,
                    consultant_id: commission.consultant_id,
                    job_id: commission.job_id,
                    subscription_id: commission.subscription_id,
                },
            })),
            ...conversionRequests.map((request) => ({
                id: `conversion:${request.id}`,
                entityId: request.id,
                entityType: 'CONVERSION_REQUEST',
                type: 'CONVERSION_EVENT',
                occurredAt: request.converted_at || request.reviewed_at || request.created_at,
                title: `Conversion ${request.status}`,
                description: request.company_name,
                metadata: {
                    status: request.status,
                    email: request.email,
                    reviewed_at: request.reviewed_at,
                    converted_at: request.converted_at,
                },
            })),
            ...overrides.map((override) => ({
                id: `override:${override.id}`,
                entityId: override.id,
                entityType: 'PRICING_OVERRIDE',
                type: 'PRICING_OVERRIDE_EVENT',
                occurredAt: override.created_at,
                title: `Pricing Override ${override.is_active ? 'Active' : 'Inactive'}`,
                description: override.notes || 'Company pricing override',
                metadata: {
                    is_active: override.is_active,
                    scope: override.scope,
                    effective_from: override.effective_from,
                    effective_to: override.effective_to,
                    created_by: override.created_by,
                    approved_by: override.approved_by,
                    price_book_id: override.price_book_id,
                },
            })),
        ];
        const sorted = events
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, limit);
        return {
            events: sorted,
            total: sorted.length,
        };
    }
    async getCompanyUsers(companyId, options) {
        await this.assertCompanyAccess(companyId, options, { region_id: true });
        const users = await prisma_1.prisma.user.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                last_login_at: true,
                created_at: true,
                updated_at: true,
            },
        });
        return {
            users,
            total: users.length,
        };
    }
    async getPricingContext(companyId, options) {
        await this.assertCompanyAccess(companyId, options, {
            region_id: true,
            billing_currency: true,
            pricing_peg: true,
            currency_locked_at: true,
            price_book_id: true,
        });
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                region_id: true,
                billing_currency: true,
                pricing_peg: true,
                currency_locked_at: true,
                price_book_id: true,
                price_book: true,
            },
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        const now = new Date();
        const [activeOverride, availablePriceBooks] = await Promise.all([
            prisma_1.prisma.enterpriseOverride.findFirst({
                where: {
                    company_id: companyId,
                    is_active: true,
                    effective_from: { lte: now },
                    OR: [{ effective_to: null }, { effective_to: { gte: now } }],
                },
                orderBy: { created_at: 'desc' },
                include: {
                    price_book: true,
                },
            }),
            prisma_1.prisma.priceBook.findMany({
                where: {
                    is_active: true,
                    is_approved: true,
                    OR: [{ is_global: true }, { region_id: company.region_id || undefined }],
                },
                orderBy: [{ is_global: 'desc' }, { updated_at: 'desc' }],
                include: {
                    region: {
                        select: { id: true, name: true, code: true },
                    },
                },
            }),
        ]);
        let resolvedPriceBook = null;
        try {
            resolvedPriceBook = await price_book_selection_service_1.PriceBookSelectionService.getEffectivePriceBook(companyId);
        }
        catch (error) {
            resolvedPriceBook = null;
        }
        return {
            company: {
                id: company.id,
                name: company.name,
                region_id: company.region_id,
                billing_currency: company.billing_currency,
                pricing_peg: company.pricing_peg,
                currency_locked_at: company.currency_locked_at,
                price_book_id: company.price_book_id,
            },
            pricingContext: {
                assignedPriceBook: company.price_book,
                activeOverride,
                resolvedPriceBook,
                availablePriceBooks,
            },
        };
    }
    async getPricingOverrides(companyId, options) {
        await this.assertCompanyAccess(companyId, options, { region_id: true });
        const overrides = await prisma_1.prisma.enterpriseOverride.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
            include: {
                price_book: {
                    include: {
                        region: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
        });
        return {
            overrides,
            total: overrides.length,
        };
    }
    async createPricingOverride(companyId, payload, actorId, options) {
        if (options.role !== 'GLOBAL_ADMIN') {
            throw new http_exception_1.HttpException(403, 'Only global admin can create pricing overrides');
        }
        await this.assertCompanyAccess(companyId, options, {
            region_id: true,
        });
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                region_id: true,
                billing_currency: true,
                pricing_peg: true,
            },
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        const source = await prisma_1.prisma.priceBook.findUnique({
            where: { id: payload.sourcePriceBookId },
            include: {
                tiers: true,
            },
        });
        if (!source) {
            throw new http_exception_1.HttpException(404, 'Source price book not found');
        }
        const effectiveFrom = this.normalizeDate(payload.effectiveFrom, new Date());
        const effectiveTo = payload.effectiveTo === null ? null : payload.effectiveTo ? this.normalizeDate(payload.effectiveTo, new Date()) : null;
        if (effectiveTo && effectiveTo <= effectiveFrom) {
            throw new http_exception_1.HttpException(400, 'effectiveTo must be greater than effectiveFrom');
        }
        const clonedPriceBook = await prisma_1.prisma.$transaction(async (tx) => {
            const book = await tx.priceBook.create({
                data: {
                    name: payload.name?.trim() || `${source.name} - ${company.name} Override`,
                    description: payload.description?.trim() || source.description || `Company-specific pricing for ${company.name}`,
                    is_global: false,
                    region_id: company.region_id,
                    currency: source.currency,
                    billing_currency: source.billing_currency || company.billing_currency || source.currency,
                    pricing_peg: source.pricing_peg || company.pricing_peg || source.billing_currency || source.currency,
                    is_active: true,
                    is_approved: true,
                    approved_at: new Date(),
                    approved_by: actorId,
                    effective_from: effectiveFrom,
                    effective_to: effectiveTo,
                    version: `${source.version || 'v1'}-company-${companyId.slice(0, 8)}-${Date.now()}`,
                },
            });
            if (source.tiers.length > 0) {
                await tx.priceTier.createMany({
                    data: source.tiers.map((tier) => ({
                        price_book_id: book.id,
                        product_id: tier.product_id,
                        name: tier.name,
                        min_quantity: tier.min_quantity,
                        max_quantity: tier.max_quantity,
                        unit_price: tier.unit_price,
                        period: tier.period,
                        band_name: tier.band_name,
                        salary_band_min: tier.salary_band_min,
                        salary_band_max: tier.salary_band_max,
                    })),
                });
            }
            const override = await tx.enterpriseOverride.create({
                data: {
                    company_id: companyId,
                    price_book_id: book.id,
                    pricing_peg: book.pricing_peg,
                    billing_currency: book.billing_currency,
                    scope: payload.scope && payload.scope.length > 0 ? payload.scope : ['ATS', 'SERVICES'],
                    effective_from: effectiveFrom,
                    effective_to: effectiveTo,
                    created_by: actorId,
                    approved_by: actorId,
                    is_active: payload.activateImmediately !== false,
                    notes: payload.notes?.trim() || `Company override created from ${source.id}`,
                },
                include: {
                    price_book: true,
                },
            });
            if (payload.activateImmediately !== false) {
                await tx.enterpriseOverride.updateMany({
                    where: {
                        company_id: companyId,
                        id: { not: override.id },
                        is_active: true,
                    },
                    data: {
                        is_active: false,
                    },
                });
            }
            await tx.auditLog.create({
                data: {
                    entity_type: 'company_pricing_override',
                    entity_id: override.id,
                    action: 'CREATE',
                    performed_by: actorId,
                    performed_by_email: 'unknown',
                    performed_by_role: 'GLOBAL_ADMIN',
                    description: `Created pricing override for company ${companyId}`,
                    changes: {
                        source_price_book_id: source.id,
                        cloned_price_book_id: book.id,
                        scope: override.scope,
                        effective_from: override.effective_from,
                        effective_to: override.effective_to,
                        is_active: override.is_active,
                    },
                },
            });
            return { override, clonedPriceBook: book };
        });
        return clonedPriceBook;
    }
    async activatePricingOverride(companyId, overrideId, actorId, options) {
        if (options.role !== 'GLOBAL_ADMIN') {
            throw new http_exception_1.HttpException(403, 'Only global admin can activate pricing overrides');
        }
        await this.assertCompanyAccess(companyId, options, { region_id: true });
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const target = await tx.enterpriseOverride.findFirst({
                where: {
                    id: overrideId,
                    company_id: companyId,
                },
                include: {
                    price_book: true,
                },
            });
            if (!target) {
                throw new http_exception_1.HttpException(404, 'Pricing override not found');
            }
            await tx.enterpriseOverride.updateMany({
                where: {
                    company_id: companyId,
                    is_active: true,
                    id: { not: overrideId },
                },
                data: { is_active: false },
            });
            const updated = await tx.enterpriseOverride.update({
                where: { id: overrideId },
                data: {
                    is_active: true,
                    approved_by: actorId,
                },
                include: {
                    price_book: true,
                },
            });
            await tx.auditLog.create({
                data: {
                    entity_type: 'company_pricing_override',
                    entity_id: overrideId,
                    action: 'ACTIVATE',
                    performed_by: actorId,
                    performed_by_email: 'unknown',
                    performed_by_role: 'GLOBAL_ADMIN',
                    description: `Activated pricing override ${overrideId} for company ${companyId}`,
                    changes: {
                        company_id: companyId,
                        override_id: overrideId,
                    },
                },
            });
            return updated;
        });
        return { override: result };
    }
    async deactivatePricingOverride(companyId, overrideId, actorId, options) {
        if (options.role !== 'GLOBAL_ADMIN') {
            throw new http_exception_1.HttpException(403, 'Only global admin can deactivate pricing overrides');
        }
        await this.assertCompanyAccess(companyId, options, { region_id: true });
        const override = await prisma_1.prisma.enterpriseOverride.findFirst({
            where: {
                id: overrideId,
                company_id: companyId,
            },
        });
        if (!override) {
            throw new http_exception_1.HttpException(404, 'Pricing override not found');
        }
        const updated = await prisma_1.prisma.enterpriseOverride.update({
            where: { id: overrideId },
            data: {
                is_active: false,
            },
            include: {
                price_book: true,
            },
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                entity_type: 'company_pricing_override',
                entity_id: overrideId,
                action: 'DEACTIVATE',
                performed_by: actorId,
                performed_by_email: 'unknown',
                performed_by_role: 'GLOBAL_ADMIN',
                description: `Deactivated pricing override ${overrideId} for company ${companyId}`,
                changes: {
                    company_id: companyId,
                    override_id: overrideId,
                },
            },
        });
        return { override: updated };
    }
    async getCompanyJobs(companyId, options) {
        await this.assertCompanyAccess(companyId, options || {}, { region_id: true });
        const jobs = await prisma_1.prisma.job.findMany({
            where: { company_id: companyId },
            include: {
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
        return {
            jobs: jobs.map((job) => ({
                id: job.id,
                title: job.title,
                status: job.status,
                type: job.employment_type,
                location: job.location,
                salaryMin: job.salary_min,
                salaryMax: job.salary_max,
                postedAt: job.posted_at || job.created_at,
                applicants: job._count.applications,
                views: job.views_count || 0,
                clicks: job.clicks_count || 0,
                createdAt: job.created_at,
            })),
        };
    }
}
exports.RegionalCompanyService = RegionalCompanyService;
