"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLicenseeLeaderboardSchema = exports.getRevenueAnalyticsSchema = exports.getRecentAuditLogsSchema = exports.searchCandidatesByNameSchema = exports.searchConsultantsSchema = exports.getMyQuickStatsSchema = exports.getMyCandidatesSchema = exports.getMyCompaniesSchema = exports.getRegionalPerformanceSchema = exports.getMyDailyBriefingSchema = exports.getActivityFeedSchema = exports.getCommunicationHistorySchema = exports.getCompanyFinancialSummarySchema = exports.getLeadPipelineSchema = exports.getOfferStatusSchema = exports.getAssessmentResultsSchema = exports.getInterviewDetailsSchema = exports.getHiringFunnelAnalyticsSchema = exports.getConsultantCommissionSchema = exports.getConsultantPerformanceSchema = exports.getJobCompleteDashboardSchema = exports.getCandidateCompleteOverviewSchema = void 0;
exports.getCandidateCompleteOverview = getCandidateCompleteOverview;
exports.getJobCompleteDashboard = getJobCompleteDashboard;
exports.getConsultantPerformance = getConsultantPerformance;
exports.getConsultantCommission = getConsultantCommission;
exports.getHiringFunnelAnalytics = getHiringFunnelAnalytics;
exports.getInterviewDetails = getInterviewDetails;
exports.getAssessmentResults = getAssessmentResults;
exports.getOfferStatus = getOfferStatus;
exports.getLeadPipeline = getLeadPipeline;
exports.getCompanyFinancialSummary = getCompanyFinancialSummary;
exports.getCommunicationHistory = getCommunicationHistory;
exports.getActivityFeed = getActivityFeed;
exports.getMyDailyBriefing = getMyDailyBriefing;
exports.getRegionalPerformance = getRegionalPerformance;
exports.getMyCompanies = getMyCompanies;
exports.getMyCandidates = getMyCandidates;
exports.getMyQuickStats = getMyQuickStats;
exports.searchConsultants = searchConsultants;
exports.searchCandidatesByName = searchCandidatesByName;
exports.getRecentAuditLogs = getRecentAuditLogs;
exports.getRevenueAnalytics = getRevenueAnalytics;
exports.getLicenseeLeaderboard = getLicenseeLeaderboard;
const zod_1 = require("zod");
const prisma_1 = require("../../utils/prisma");
const assistant_access_control_1 = require("./assistant.access-control");
// ============================================================================
// SHARED SCHEMAS
// ============================================================================
const textQuerySchema = zod_1.z.string().trim().min(2).max(120);
const uuidSchema = zod_1.z.string().uuid();
const timeRangeSchema = zod_1.z
    .object({
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
})
    .optional();
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const SEARCH_STOP_WORDS = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'jobs',
    'job',
    'recent',
    'posted',
    'status',
    'show',
    'about',
    'of',
    'at',
    'in',
    'on',
]);
function extractSearchTokens(query) {
    return query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token))
        .slice(0, 6);
}
function buildTokenAndFilter(tokens, fields) {
    if (!tokens.length)
        return null;
    return {
        AND: tokens.map((token) => ({
            OR: fields.map((field) => {
                const parts = field.split('.');
                if (parts.length === 1) {
                    return { [field]: { contains: token, mode: 'insensitive' } };
                }
                else {
                    // Nested field like "company.name"
                    const [relation, nestedField] = parts;
                    return {
                        [relation]: {
                            is: { [nestedField]: { contains: token, mode: 'insensitive' } },
                        },
                    };
                }
            }),
        })),
    };
}
// ============================================================================
// TOOL SCHEMAS
// ============================================================================
exports.getCandidateCompleteOverviewSchema = zod_1.z.object({
    candidateQuery: textQuerySchema.describe('Candidate ID, email, or full name'),
    includeAssessments: zod_1.z.boolean().optional().default(true),
    includeInterviews: zod_1.z.boolean().optional().default(true),
    includeOffers: zod_1.z.boolean().optional().default(true),
});
exports.getJobCompleteDashboardSchema = zod_1.z.object({
    jobQuery: textQuerySchema.describe('Job ID, job code, job title, or company name/domain'),
    includeAnalytics: zod_1.z.boolean().optional().default(true),
});
exports.getConsultantPerformanceSchema = zod_1.z.object({
    consultantQuery: textQuerySchema.optional().describe('Consultant ID or email (admins only)'),
    timeRange: timeRangeSchema,
});
exports.getConsultantCommissionSchema = zod_1.z.object({
    consultantQuery: textQuerySchema.optional().describe('Consultant ID or email (admins only)'),
    status: zod_1.z.enum(['ALL', 'PENDING', 'APPROVED', 'PAID', 'WITHDRAWN']).optional().default('ALL'),
});
exports.getHiringFunnelAnalyticsSchema = zod_1.z.object({
    scope: zod_1.z.enum(['company', 'region', 'job']),
    identifier: zod_1.z.string().optional(),
    timeRange: timeRangeSchema,
});
exports.getInterviewDetailsSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid().nullish().transform((val) => val || undefined),
    jobQuery: textQuerySchema.optional(),
    candidateQuery: textQuerySchema.optional(),
});
exports.getAssessmentResultsSchema = zod_1.z.object({
    applicationId: uuidSchema,
    includeResponses: zod_1.z.boolean().optional().default(false),
});
exports.getOfferStatusSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid().nullish().transform((val) => val || undefined),
    candidateQuery: textQuerySchema.optional(),
    jobQuery: textQuerySchema.optional(),
});
exports.getLeadPipelineSchema = zod_1.z.object({
    regionId: zod_1.z.string().uuid().nullish().transform((val) => val || undefined),
    consultantQuery: textQuerySchema.optional(),
    status: zod_1.z.enum(['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED']).optional().default('ALL'),
});
exports.getCompanyFinancialSummarySchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid().nullish().transform((val) => val || undefined),
    timeRange: timeRangeSchema,
});
exports.getCommunicationHistorySchema = zod_1.z.object({
    entityType: zod_1.z.enum(['candidate', 'company', 'job', 'application']),
    entityId: zod_1.z.string(),
    communicationType: zod_1.z.enum(['email', 'call', 'sms', 'notification', 'all']).optional().default('all'),
    limit: zod_1.z.number().int().min(1).max(50).optional().default(20),
});
exports.getActivityFeedSchema = zod_1.z.object({
    scope: zod_1.z.enum(['job', 'candidate', 'company', 'consultant']),
    identifier: zod_1.z.string(),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(50),
    activityTypes: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.getMyDailyBriefingSchema = zod_1.z.object({});
exports.getRegionalPerformanceSchema = zod_1.z.object({
    regionId: zod_1.z
        .string()
        .uuid()
        .nullish()
        .transform((val) => val || undefined)
        .describe('Optional region UUID. Leave empty or omit to use all your assigned regions.'),
    timeRange: timeRangeSchema,
});
// New consultant-specific tool schemas
exports.getMyCompaniesSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'ALL']).optional().default('ACTIVE'),
});
exports.getMyCandidatesSchema = zod_1.z.object({
    status: zod_1.z.enum(['ALL', 'NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']).optional().default('ALL'),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(50),
});
exports.getMyQuickStatsSchema = zod_1.z.object({});
// New admin search tool schemas
exports.searchConsultantsSchema = zod_1.z.object({
    query: textQuerySchema.describe('Consultant name, email, or partial match. Required field.'),
    regionId: zod_1.z
        .string()
        .uuid()
        .nullish()
        .transform((val) => val || undefined)
        .describe('Optional region UUID to filter results. Leave empty or omit to search all accessible regions.'),
    limit: zod_1.z.number().int().min(1).max(50).optional().default(20),
});
exports.searchCandidatesByNameSchema = zod_1.z.object({
    query: textQuerySchema.describe('Candidate name or email'),
    limit: zod_1.z.number().int().min(1).max(50).optional().default(20),
});
// New admin monitoring tools
exports.getRecentAuditLogsSchema = zod_1.z.object({
    limit: zod_1.z.number().int().min(1).max(50).optional().default(5),
    entityType: zod_1.z.enum(['USER', 'JOB', 'APPLICATION', 'COMPANY', 'CONSULTANT', 'ALL']).optional().default('ALL'),
    actionType: zod_1.z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ALL']).optional().default('ALL'),
});
exports.getRevenueAnalyticsSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'ALL_TIME']).optional().default('THIS_MONTH'),
    regionId: zod_1.z.string().uuid().nullish().transform((val) => val || undefined).describe('Optional region UUID to filter results. Leave empty to use all regions.'),
    includeCompanyBreakdown: zod_1.z.boolean().optional().default(true),
    includeSharingInsights: zod_1.z.boolean().optional().default(true).describe('Include HRM8 vs Licensee share details'),
});
exports.getLicenseeLeaderboardSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'ALL_TIME']).optional().default('THIS_MONTH'),
    metric: zod_1.z.enum(['TOTAL_REVENUE', 'HRM8_SHARE', 'PLACEMENTS']).optional().default('TOTAL_REVENUE'),
    limit: zod_1.z.number().int().min(1).max(20).optional().default(10),
});
// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================
/**
 * Get comprehensive candidate overview with all related data
 */
async function getCandidateCompleteOverview(args, actor) {
    const { candidateQuery, includeAssessments, includeInterviews, includeOffers } = exports.getCandidateCompleteOverviewSchema.parse(args);
    // Build scope filters
    let applicationScopeWhere = {};
    if (actor.actorType === 'COMPANY_USER') {
        applicationScopeWhere = {
            job: { is: { company_id: actor.companyId } },
        };
    }
    else {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (regionScope && regionScope.length > 0) {
            applicationScopeWhere = {
                job: { is: { region_id: { in: regionScope } } },
            };
        }
        // Consultants: only assigned jobs
        if (assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
            applicationScopeWhere = {
                job: { is: { ...applicationScopeWhere.job?.is, assigned_consultant_id: actor.userId } },
            };
        }
    }
    // Find candidate
    const candidate = await prisma_1.prisma.candidate.findFirst({
        where: {
            OR: [
                { id: candidateQuery },
                { email: { equals: candidateQuery, mode: 'insensitive' } },
                {
                    AND: candidateQuery.includes(' ')
                        ? candidateQuery
                            .split(' ')
                            .slice(0, 2)
                            .map((part) => ({
                            OR: [
                                { first_name: { contains: part, mode: 'insensitive' } },
                                { last_name: { contains: part, mode: 'insensitive' } },
                            ],
                        }))
                        : [
                            {
                                OR: [
                                    { first_name: { contains: candidateQuery, mode: 'insensitive' } },
                                    { last_name: { contains: candidateQuery, mode: 'insensitive' } },
                                ],
                            },
                        ],
                },
            ],
            applications: { some: applicationScopeWhere },
        },
        include: {
            applications: {
                where: applicationScopeWhere,
                include: {
                    job: {
                        select: {
                            id: true,
                            title: true,
                            job_code: true,
                            company: { select: { name: true, domain: true } },
                            status: true,
                        },
                    },
                },
                orderBy: { updated_at: 'desc' },
                take: 10,
            },
        },
    });
    if (!candidate) {
        return { found: false, reason: 'Candidate not found in your access scope.' };
    }
    const applicationIds = candidate.applications.map((app) => app.id);
    // Fetch additional data in parallel
    const [assessments, interviews, offers, recentActivity] = await Promise.all([
        // Assessment data structure doesn't match - skip for now
        Promise.resolve([]),
        includeInterviews && applicationIds.length
            ? prisma_1.prisma.videoInterview.findMany({
                where: { application_id: { in: applicationIds } },
                select: {
                    id: true,
                    application_id: true,
                    scheduled_date: true,
                    status: true,
                    type: true,
                    duration: true,
                },
                orderBy: { scheduled_date: 'desc' },
                take: 10,
            })
            : Promise.resolve([]),
        includeOffers && applicationIds.length
            ? prisma_1.prisma.offerLetter.findMany({
                where: { application_id: { in: applicationIds } },
                select: {
                    id: true,
                    application_id: true,
                    job_id: true,
                    status: true,
                    sent_date: true,
                    expiry_date: true,
                    responded_date: true,
                    offer_negotiation: {
                        select: { id: true, created_at: true },
                        orderBy: { created_at: 'desc' },
                        take: 3,
                    },
                },
                orderBy: { created_at: 'desc' },
                take: 5,
            })
            : Promise.resolve([]),
        // Activity model doesn't support generic entity tracking
        // Skip for now - would need separate candidate activity tracking
        Promise.resolve([]),
    ]);
    return {
        found: true,
        candidate: {
            id: candidate.id,
            fullName: `${candidate.first_name} ${candidate.last_name}`.trim(),
            email: candidate.email,
            phone: candidate.phone,
            status: candidate.status,
            updatedAt: candidate.updated_at,
        },
        applications: candidate.applications.map((app) => ({
            id: app.id,
            jobId: app.job_id,
            jobTitle: app.job.title,
            jobCode: app.job.job_code,
            companyName: app.job.company?.name,
            status: app.status,
            stage: app.stage,
            score: app.score,
            appliedDate: app.applied_date,
            updatedAt: app.updated_at,
        })),
        assessments: [], // Assessment data structure doesn't match schema
        interviews: interviews.map((vi) => ({
            id: vi.id,
            applicationId: vi.application_id,
            scheduledDate: vi.scheduled_date,
            status: vi.status,
            type: vi.type,
            duration: vi.duration,
        })),
        offers: offers.map((offer) => ({
            id: offer.id,
            applicationId: offer.application_id,
            jobId: offer.job_id,
            status: offer.status,
            sentDate: offer.sent_date,
            expiryDate: offer.expiry_date,
            respondedDate: offer.responded_date,
            negotiationsCount: offer.offer_negotiation?.length || 0,
        })),
        recentActivity: [], // Activity model doesn't support generic entity tracking
        summary: {
            totalApplications: candidate.applications.length,
            assessmentsCompleted: assessments.length,
            interviewsScheduled: interviews.length,
            offersReceived: offers.length,
        },
    };
}
/**
 * Get comprehensive job dashboard with all metrics
 */
async function getJobCompleteDashboard(args, actor) {
    const { jobQuery, includeAnalytics } = exports.getJobCompleteDashboardSchema.parse(args);
    const searchTokens = extractSearchTokens(jobQuery);
    const tokenFilter = buildTokenAndFilter(searchTokens, ['title', 'job_code', 'company.name', 'company.domain']);
    // Build base scope
    let baseWhere = {};
    if (actor.actorType === 'COMPANY_USER') {
        baseWhere.company_id = actor.companyId;
    }
    else {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (regionScope && regionScope.length > 0) {
            baseWhere.region_id = { in: regionScope };
        }
        if (assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
            baseWhere.assigned_consultant_id = actor.userId;
        }
    }
    // Find job
    const job = await prisma_1.prisma.job.findFirst({
        where: {
            ...baseWhere,
            OR: [
                { id: jobQuery },
                { job_code: { equals: jobQuery, mode: 'insensitive' } },
                { title: { contains: jobQuery, mode: 'insensitive' } },
                { company: { is: { name: { contains: jobQuery, mode: 'insensitive' } } } },
                { company: { is: { domain: { contains: jobQuery, mode: 'insensitive' } } } },
                ...(tokenFilter ? [tokenFilter] : []),
            ],
        },
        include: {
            company: { select: { id: true, name: true, domain: true } },
            _count: { select: { applications: true } },
        },
    });
    if (!job) {
        return { found: false, reason: 'Job not found in your access scope.' };
    }
    // Fetch related data in parallel
    const [pipelineByStage, pipelineByStatus, topCandidates, upcomingInterviews, pendingOffers, analytics] = await Promise.all([
        prisma_1.prisma.application.groupBy({
            by: ['stage'],
            where: { job_id: job.id },
            _count: { _all: true },
        }),
        prisma_1.prisma.application.groupBy({
            by: ['status'],
            where: { job_id: job.id },
            _count: { _all: true },
        }),
        prisma_1.prisma.application.findMany({
            where: { job_id: job.id, status: { in: ['SCREENING', 'INTERVIEW', 'OFFER'] } },
            include: {
                candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
            },
            orderBy: [{ score: 'desc' }, { updated_at: 'desc' }],
            take: 10,
        }),
        prisma_1.prisma.videoInterview.findMany({
            where: {
                job_id: job.id,
                scheduled_date: { gte: new Date() },
                status: { in: ['SCHEDULED'] },
            },
            select: {
                id: true,
                candidate_id: true,
                scheduled_date: true,
                type: true,
                status: true,
            },
            orderBy: { scheduled_date: 'asc' },
            take: 10,
        }),
        prisma_1.prisma.offerLetter.findMany({
            where: {
                job_id: job.id,
                status: { in: ['SENT', 'UNDER_NEGOTIATION'] },
            },
            select: {
                id: true,
                candidate_id: true,
                status: true,
                sent_date: true,
                expiry_date: true,
            },
            orderBy: { sent_date: 'desc' },
            take: 5,
        }),
        // JobAnalytics only tracks events, not aggregates - skip for now
        Promise.resolve(null),
    ]);
    return {
        found: true,
        job: {
            id: job.id,
            jobCode: job.job_code,
            title: job.title,
            status: job.status,
            companyName: job.company?.name,
            companyDomain: job.company?.domain,
            location: job.location,
            department: job.department,
            vacancies: job.number_of_vacancies,
            assignmentMode: job.assignment_mode,
            assignedConsultantId: job.assigned_consultant_id,
            postedAt: job.posted_at,
            closeDate: job.close_date,
            updatedAt: job.updated_at,
        },
        pipeline: {
            byStage: pipelineByStage.map((item) => ({ stage: item.stage, count: item._count._all })),
            byStatus: pipelineByStatus.map((item) => ({ status: item.status, count: item._count._all })),
            totalApplications: job._count.applications,
        },
        topCandidates: topCandidates.map((app) => ({
            applicationId: app.id,
            candidateName: `${app.candidate.first_name} ${app.candidate.last_name}`.trim(),
            candidateEmail: app.candidate.email,
            status: app.status,
            stage: app.stage,
            score: app.score,
            updatedAt: app.updated_at,
        })),
        upcomingInterviews: upcomingInterviews.map((vi) => ({
            candidateId: vi.candidate_id,
            scheduledDate: vi.scheduled_date,
            type: vi.type,
            status: vi.status,
        })),
        pendingOffers: pendingOffers.map((offer) => ({
            candidateId: offer.candidate_id,
            status: offer.status,
            sentDate: offer.sent_date,
            expiryDate: offer.expiry_date,
        })),
        analytics: null, // JobAnalytics doesn't store aggregates
    };
}
/**
 * Get consultant performance metrics
 */
async function getConsultantPerformance(args, actor) {
    const { consultantQuery, timeRange } = exports.getConsultantPerformanceSchema.parse(args);
    // Enforce self-scope for consultants
    const consultantId = await assistant_access_control_1.AssistantAccessControl.enforceConsultantSelfScope(actor, consultantQuery);
    // Build time filter
    const timeFilter = {};
    if (timeRange?.from)
        timeFilter.gte = new Date(timeRange.from);
    if (timeRange?.to)
        timeFilter.lte = new Date(timeRange.to);
    // Fetch consultant data
    const [consultant, assignedJobs, placements, commissions, activities] = await Promise.all([
        prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            include: {
                region: { select: { name: true } },
            },
        }),
        prisma_1.prisma.consultantJobAssignment.findMany({
            where: {
                consultant_id: consultantId,
                ...(Object.keys(timeFilter).length ? { assigned_at: timeFilter } : {}),
            },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        job_code: true,
                        status: true,
                        company: { select: { name: true } },
                    },
                },
            },
            orderBy: { assigned_at: 'desc' },
            take: 20,
        }),
        prisma_1.prisma.application.groupBy({
            by: ['status'],
            where: {
                job: { is: { assigned_consultant_id: consultantId } },
                ...(Object.keys(timeFilter).length ? { updated_at: timeFilter } : {}),
            },
            _count: { _all: true },
        }),
        prisma_1.prisma.commission.aggregate({
            where: {
                consultant_id: consultantId,
                ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
            },
            _sum: { amount: true },
            _count: { id: true },
        }),
        prisma_1.prisma.activity.count({
            where: {
                created_by: consultantId,
                ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
            },
        }),
    ]);
    if (!consultant) {
        return { found: false, reason: 'Consultant not found.' };
    }
    return {
        found: true,
        consultant: {
            id: consultant.id,
            name: `${consultant.first_name || ''} ${consultant.last_name || ''}`.trim(),
            email: consultant.email,
            regionName: consultant.region?.name,
            status: consultant.status,
        },
        assignments: {
            total: assignedJobs.length,
            jobs: assignedJobs.map((assignment) => ({
                jobId: assignment.job.id,
                jobTitle: assignment.job.title,
                jobCode: assignment.job.job_code,
                companyName: assignment.job.company?.name,
                status: assignment.job.status,
                assignedAt: assignment.assigned_at,
            })),
        },
        placements: {
            total: placements.reduce((sum, item) => sum + item._count._all, 0),
            byStatus: placements.map((item) => ({ status: item.status, count: item._count._all })),
        },
        commissions: {
            total: commissions._sum.amount || 0,
            count: commissions._count.id,
        },
        activityCount: activities,
    };
}
/**
 * Get consultant commission details
 */
async function getConsultantCommission(args, actor) {
    const { consultantQuery, status } = exports.getConsultantCommissionSchema.parse(args);
    const consultantId = await assistant_access_control_1.AssistantAccessControl.enforceConsultantSelfScope(actor, consultantQuery);
    const statusFilter = {};
    if (status !== 'ALL') {
        statusFilter.status = status;
    }
    const [commissions, withdrawals, summary] = await Promise.all([
        prisma_1.prisma.commission.findMany({
            where: {
                consultant_id: consultantId,
                ...statusFilter,
            },
            select: {
                id: true,
                amount: true,
                status: true,
                type: true,
                job_id: true,
                created_at: true,
                confirmed_at: true,
                paid_at: true,
            },
            orderBy: { created_at: 'desc' },
            take: 50,
        }),
        prisma_1.prisma.commissionWithdrawal.findMany({
            where: { consultant_id: consultantId },
            orderBy: { created_at: 'desc' },
            take: 20,
        }),
        prisma_1.prisma.commission.groupBy({
            by: ['status'],
            where: { consultant_id: consultantId },
            _sum: { amount: true },
            _count: { id: true },
        }),
    ]);
    return {
        found: true,
        commissions: commissions.map((comm) => ({
            id: comm.id,
            amount: comm.amount,
            status: comm.status,
            type: comm.type,
            jobId: comm.job_id,
            createdAt: comm.created_at,
            confirmedAt: comm.confirmed_at,
            paidAt: comm.paid_at,
        })),
        withdrawals: withdrawals.map((wd) => ({
            id: wd.id,
            amount: wd.amount,
            status: wd.status,
            createdAt: wd.created_at,
            processedAt: wd.processed_at,
        })),
        summary: {
            byStatus: summary.map((item) => ({
                status: item.status,
                amount: item._sum.amount || 0,
                count: item._count.id,
            })),
            totalEarned: summary.reduce((sum, item) => sum + (item._sum.amount || 0), 0),
        },
    };
}
/**
 * Get hiring funnel analytics
 */
async function getHiringFunnelAnalytics(args, actor) {
    const { scope, identifier, timeRange } = exports.getHiringFunnelAnalyticsSchema.parse(args);
    const timeFilter = {};
    if (timeRange?.from)
        timeFilter.gte = new Date(timeRange.from);
    if (timeRange?.to)
        timeFilter.lte = new Date(timeRange.to);
    let baseWhere = {};
    if (scope === 'company') {
        if (actor.actorType === 'COMPANY_USER') {
            baseWhere.job = { is: { company_id: actor.companyId } };
        }
        else if (identifier) {
            baseWhere.job = { is: { company_id: identifier } };
        }
        else {
            return { found: false, reason: 'Company identifier required for company scope.' };
        }
    }
    else if (scope === 'region') {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (regionScope && regionScope.length > 0) {
            baseWhere.job = { is: { region_id: { in: regionScope } } };
        }
    }
    else if (scope === 'job') {
        if (!identifier) {
            return { found: false, reason: 'Job identifier required for job scope.' };
        }
        baseWhere.job_id = identifier;
    }
    if (Object.keys(timeFilter).length) {
        baseWhere.created_at = timeFilter;
    }
    const [byStage, byStatus, timeToHireData] = await Promise.all([
        prisma_1.prisma.application.groupBy({
            by: ['stage'],
            where: baseWhere,
            _count: { _all: true },
        }),
        prisma_1.prisma.application.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: { _all: true },
        }),
        prisma_1.prisma.application.findMany({
            where: {
                ...baseWhere,
                status: 'HIRED',
                applied_date: { not: null },
            },
            select: {
                applied_date: true,
                updated_at: true,
            },
        }),
    ]);
    const timeToHireValues = timeToHireData
        .map((app) => {
        if (!app.applied_date)
            return null;
        const days = Math.floor((app.updated_at.getTime() - app.applied_date.getTime()) / (1000 * 60 * 60 * 24));
        return days;
    })
        .filter((val) => val !== null);
    const avgTimeToHire = timeToHireValues.length > 0 ? timeToHireValues.reduce((sum, val) => sum + val, 0) / timeToHireValues.length : 0;
    return {
        found: true,
        scope,
        funnel: {
            byStage: byStage.map((item) => ({ stage: item.stage, count: item._count._all })),
            byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
        },
        metrics: {
            totalApplications: byStatus.reduce((sum, item) => sum + item._count._all, 0),
            avgTimeToHireDays: Math.round(avgTimeToHire),
            hiredCount: timeToHireValues.length,
        },
    };
}
/**
 * Get interview details
 */
async function getInterviewDetails(args, actor) {
    const { applicationId, jobQuery, candidateQuery } = exports.getInterviewDetailsSchema.parse(args);
    let applicationWhere = {};
    if (applicationId) {
        applicationWhere.id = applicationId;
    }
    else if (candidateQuery || jobQuery) {
        if (candidateQuery) {
            applicationWhere.candidate = {
                OR: [
                    { id: candidateQuery },
                    { email: { equals: candidateQuery, mode: 'insensitive' } },
                    { first_name: { contains: candidateQuery, mode: 'insensitive' } },
                    { last_name: { contains: candidateQuery, mode: 'insensitive' } },
                ],
            };
        }
        if (jobQuery) {
            applicationWhere.job = {
                is: {
                    OR: [
                        { id: jobQuery },
                        { job_code: { equals: jobQuery, mode: 'insensitive' } },
                        { title: { contains: jobQuery, mode: 'insensitive' } },
                    ],
                },
            };
        }
    }
    else {
        return { found: false, reason: 'Please provide applicationId, candidateQuery, or jobQuery.' };
    }
    // Apply scoping
    if (actor.actorType === 'COMPANY_USER') {
        const existingJobFilter = applicationWhere.job?.is || {};
        applicationWhere.job = { is: { ...existingJobFilter, company_id: actor.companyId } };
    }
    else {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (regionScope && regionScope.length > 0) {
            const existingJobFilter = applicationWhere.job?.is || {};
            applicationWhere.job = { is: { ...existingJobFilter, region_id: { in: regionScope } } };
        }
    }
    const applications = await prisma_1.prisma.application.findMany({
        where: applicationWhere,
        include: {
            candidate: { select: { first_name: true, last_name: true, email: true } },
            job: { select: { title: true, job_code: true } },
        },
        take: 5,
    });
    if (!applications.length) {
        return { found: false, reason: 'No applications found in your scope.' };
    }
    const applicationIds = applications.map((app) => app.id);
    const interviews = await prisma_1.prisma.videoInterview.findMany({
        where: { application_id: { in: applicationIds } },
        include: {
            application: {
                select: {
                    candidate: { select: { first_name: true, last_name: true } },
                    job: { select: { title: true } },
                },
            },
            interview_feedback: true,
        },
        orderBy: { scheduled_date: 'desc' },
    });
    return {
        found: true,
        interviews: interviews.map((vi) => ({
            id: vi.id,
            candidateName: `${vi.application.candidate.first_name} ${vi.application.candidate.last_name}`.trim(),
            jobTitle: vi.application.job.title,
            scheduledAt: vi.scheduled_date,
            status: vi.status,
            type: vi.type,
            duration: vi.duration,
            feedbackCount: vi.interview_feedback.length,
        })),
    };
}
/**
 * Get assessment results
 */
async function getAssessmentResults(args, actor) {
    // DISABLED: AssessmentResponse model doesn't have application_id field
    // Schema mismatch - needs rework to query by candidate_id instead
    return {
        found: false,
        reason: 'Assessment results not available - schema mismatch.',
    };
}
/**
 * Get offer status and negotiations
 */
async function getOfferStatus(args, actor) {
    const { applicationId, candidateQuery, jobQuery } = exports.getOfferStatusSchema.parse(args);
    let applicationWhere = {};
    if (applicationId) {
        applicationWhere.id = applicationId;
    }
    else if (candidateQuery || jobQuery) {
        if (candidateQuery) {
            applicationWhere.candidate = {
                OR: [
                    { id: candidateQuery },
                    { email: { equals: candidateQuery, mode: 'insensitive' } },
                ],
            };
        }
        if (jobQuery) {
            applicationWhere.job = {
                is: {
                    OR: [
                        { id: jobQuery },
                        { job_code: { equals: jobQuery, mode: 'insensitive' } },
                        { title: { contains: jobQuery, mode: 'insensitive' } },
                    ],
                },
            };
        }
    }
    else {
        return { found: false, reason: 'Please provide applicationId, candidateQuery, or jobQuery.' };
    }
    // Apply scoping
    if (actor.actorType === 'COMPANY_USER') {
        const existingJobFilter = applicationWhere.job?.is || {};
        applicationWhere.job = { is: { ...existingJobFilter, company_id: actor.companyId } };
    }
    else {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (regionScope && regionScope.length > 0) {
            const existingJobFilter = applicationWhere.job?.is || {};
            applicationWhere.job = { is: { ...existingJobFilter, region_id: { in: regionScope } } };
        }
    }
    const applications = await prisma_1.prisma.application.findMany({
        where: applicationWhere,
        select: { id: true },
        take: 10,
    });
    if (!applications.length) {
        return { found: false, reason: 'No applications found in your scope.' };
    }
    const applicationIds = applications.map((app) => app.id);
    const offers = await prisma_1.prisma.offerLetter.findMany({
        where: { application_id: { in: applicationIds } },
        include: {
            application: {
                include: {
                    candidate: { select: { first_name: true, last_name: true, email: true } },
                    job: { select: { title: true, company: { select: { name: true } } } },
                },
            },
            offer_negotiation: {
                orderBy: { created_at: 'desc' },
            },
        },
        orderBy: { created_at: 'desc' },
    });
    return {
        found: true,
        offers: offers.map((offer) => ({
            id: offer.id,
            candidateName: `${offer.application.candidate.first_name} ${offer.application.candidate.last_name}`.trim(),
            candidateEmail: offer.application.candidate.email,
            jobTitle: offer.application.job.title,
            companyName: offer.application.job.company?.name,
            status: offer.status,
            sentAt: offer.sent_date,
            expiresAt: offer.expiry_date,
            acceptedAt: offer.responded_date,
            rejectedAt: offer.responded_date,
            negotiations: offer.offer_negotiation.map((neg) => ({
                id: neg.id,
                createdAt: neg.created_at,
            })),
        })),
    };
}
/**
 * Get lead pipeline
 */
async function getLeadPipeline(args, actor) {
    const { regionId, consultantQuery, status } = exports.getLeadPipelineSchema.parse(args);
    if (actor.actorType === 'COMPANY_USER') {
        return { found: false, reason: 'This tool is only available for HRM8 users and consultants.' };
    }
    let baseWhere = {};
    // Apply region scope
    if (regionId) {
        baseWhere.region_id = regionId;
    }
    else {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (regionScope && regionScope.length > 0) {
            baseWhere.region_id = { in: regionScope };
        }
    }
    // Apply consultant filter
    if (consultantQuery) {
        const consultantId = await assistant_access_control_1.AssistantAccessControl.enforceConsultantSelfScope(actor, consultantQuery);
        baseWhere.assigned_consultant_id = consultantId;
    }
    else if (assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
        baseWhere.assigned_consultant_id = actor.userId;
    }
    // Apply status filter
    if (status !== 'ALL') {
        baseWhere.status = status;
    }
    // Fetch leads first
    const leads = await prisma_1.prisma.lead.findMany({
        where: baseWhere,
        include: {
            company: { select: { name: true, domain: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 50,
    });
    // Then fetch opportunities for converted companies
    const opportunities = leads.length > 0 && leads.some((l) => l.converted_to_company_id)
        ? await prisma_1.prisma.opportunity.findMany({
            where: {
                company_id: { in: leads.map((l) => l.converted_to_company_id).filter(Boolean) },
            },
            select: {
                id: true,
                company_id: true,
                name: true,
                stage: true,
                amount: true,
                expected_close_date: true,
                probability: true,
            },
            orderBy: { created_at: 'desc' },
            take: 50,
        })
        : [];
    return {
        found: true,
        leads: leads.map((lead) => ({
            id: lead.id,
            companyName: lead.company_name,
            email: lead.email,
            status: lead.status,
            leadSource: lead.lead_source,
            createdAt: lead.created_at,
        })),
        opportunities: opportunities.map((opp) => ({
            id: opp.id,
            companyId: opp.company_id,
            name: opp.name,
            stage: opp.stage,
            amount: opp.amount,
            closeDate: opp.expected_close_date,
            probability: opp.probability,
        })),
    };
}
/**
 * Get company financial summary
 */
async function getCompanyFinancialSummary(args, actor) {
    const { companyId, timeRange } = exports.getCompanyFinancialSummarySchema.parse(args);
    let targetCompanyId;
    if (actor.actorType === 'COMPANY_USER') {
        targetCompanyId = actor.companyId;
    }
    else if (companyId) {
        // Verify company is in scope
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        const company = await prisma_1.prisma.company.findFirst({
            where: {
                id: companyId,
                ...(regionScope && regionScope.length > 0 ? { region_id: { in: regionScope } } : {}),
            },
            select: { id: true },
        });
        if (!company) {
            return { found: false, reason: 'Company not found in your scope.' };
        }
        targetCompanyId = company.id;
    }
    else {
        return { found: false, reason: 'Company ID required.' };
    }
    const timeFilter = {};
    if (timeRange?.from)
        timeFilter.gte = new Date(timeRange.from);
    if (timeRange?.to)
        timeFilter.lte = new Date(timeRange.to);
    const [subscriptions, bills, revenue] = await Promise.all([
        prisma_1.prisma.subscription.findMany({
            where: {
                company_id: targetCompanyId,
                ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
            },
            orderBy: { created_at: 'desc' },
            take: 10,
        }),
        prisma_1.prisma.bill.findMany({
            where: {
                company_id: targetCompanyId,
                ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
            },
            orderBy: { created_at: 'desc' },
            take: 20,
        }),
        prisma_1.prisma.bill.aggregate({
            where: {
                company_id: targetCompanyId,
                status: 'PAID',
                ...(Object.keys(timeFilter).length ? { paid_at: timeFilter } : {}),
            },
            _sum: { amount: true },
        }),
    ]);
    return {
        found: true,
        subscriptions: subscriptions.map((sub) => ({
            id: sub.id,
            plan: sub.plan_type,
            status: sub.status,
            startDate: sub.start_date,
            endDate: sub.end_date,
        })),
        bills: bills.map((bill) => ({
            id: bill.id,
            amount: bill.amount,
            status: bill.status,
            dueDate: bill.due_date,
            paidAt: bill.paid_at,
        })),
        totalRevenue: revenue._sum.amount || 0,
    };
}
/**
 * Get communication history
 */
async function getCommunicationHistory(args, actor) {
    // DISABLED: EmailLog, CallLog, SmsLog models are not accessible in Prisma client
    return {
        found: false,
        reason: 'Communication history is not available - log models not configured.',
    };
}
/**
 * Get activity feed
 */
async function getActivityFeed(args, actor) {
    const { scope, identifier, limit, activityTypes } = exports.getActivityFeedSchema.parse(args);
    const where = {
        entity_type: scope.toUpperCase(),
        entity_id: identifier,
    };
    if (activityTypes && activityTypes.length > 0) {
        where.action = { in: activityTypes };
    }
    const activities = await prisma_1.prisma.activity.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
    });
    return {
        found: true,
        activities: activities.map((activity) => ({
            id: activity.id,
            type: activity.type,
            description: activity.description,
            createdAt: activity.created_at,
            createdBy: activity.created_by,
        })),
    };
}
/**
 * Get consultant daily briefing
 */
async function getMyDailyBriefing(args, actor) {
    if (!assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
        return { found: false, reason: 'This tool is only available for consultants.' };
    }
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [assignedJobs, upcomingInterviews, pendingApplications, recentCommissions] = await Promise.all([
        prisma_1.prisma.job.findMany({
            where: {
                assigned_consultant_id: actor.userId,
                status: { in: ['OPEN'] },
            },
            select: {
                id: true,
                title: true,
                job_code: true,
                company: { select: { name: true } },
                _count: { select: { applications: true } },
            },
            take: 10,
        }),
        prisma_1.prisma.videoInterview.findMany({
            where: {
                application: {
                    is: {
                        job: {
                            is: { assigned_consultant_id: actor.userId },
                        },
                    },
                },
                scheduled_date: {
                    gte: today,
                    lte: sevenDaysFromNow,
                },
                status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            },
            include: {
                application: {
                    include: {
                        candidate: { select: { first_name: true, last_name: true, email: true } },
                        job: { select: { title: true } },
                    },
                },
            },
            orderBy: { scheduled_date: 'asc' },
            take: 10,
        }),
        prisma_1.prisma.application.findMany({
            where: {
                job: {
                    is: { assigned_consultant_id: actor.userId },
                },
                status: { in: ['NEW', 'SCREENING'] },
            },
            include: {
                candidate: { select: { first_name: true, last_name: true, email: true } },
                job: { select: { title: true } },
            },
            orderBy: { updated_at: 'asc' },
            take: 10,
        }),
        prisma_1.prisma.commission.aggregate({
            where: {
                consultant_id: actor.userId,
                created_at: {
                    gte: thirtyDaysAgo,
                },
            },
            _sum: { amount: true },
            _count: { id: true },
        }),
    ]);
    return {
        found: true,
        date: today.toISOString(),
        summary: {
            assignedJobsCount: assignedJobs.length,
            upcomingInterviewsCount: upcomingInterviews.length,
            pendingApplicationsCount: pendingApplications.length,
            monthlyCommissionsAmount: recentCommissions._sum.amount || 0,
            monthlyCommissionsCount: recentCommissions._count.id,
        },
        assignedJobs: assignedJobs.map((job) => ({
            id: job.id,
            title: job.title,
            jobCode: job.job_code,
            companyName: job.company?.name,
            applicationsCount: job._count.applications,
        })),
        upcomingInterviews: upcomingInterviews.map((vi) => ({
            candidateName: `${vi.application.candidate.first_name} ${vi.application.candidate.last_name}`.trim(),
            jobTitle: vi.application.job.title,
            scheduledAt: vi.scheduled_date,
            type: vi.type,
        })),
        pendingApplications: pendingApplications.map((app) => ({
            candidateName: `${app.candidate.first_name} ${app.candidate.last_name}`.trim(),
            jobTitle: app.job.title,
            status: app.status,
            updatedAt: app.updated_at,
        })),
    };
}
/**
 * Get regional performance metrics
 */
async function getRegionalPerformance(args, actor) {
    const { regionId, timeRange } = exports.getRegionalPerformanceSchema.parse(args);
    if (actor.actorType === 'COMPANY_USER') {
        return { found: false, reason: 'This tool is only available for HRM8 users.' };
    }
    let targetRegionId;
    if (assistant_access_control_1.AssistantAccessControl.isGlobalAdmin(actor)) {
        targetRegionId = regionId;
    }
    else {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (!regionScope || regionScope.length === 0) {
            return { found: false, reason: 'No assigned regions.' };
        }
        if (regionId) {
            if (!regionScope.includes(regionId)) {
                return { found: false, reason: 'Region not in your scope.' };
            }
            targetRegionId = regionId;
        }
        else {
            targetRegionId = regionScope[0]; // Default to first assigned region
        }
    }
    if (!targetRegionId) {
        return { found: false, reason: 'Region ID required.' };
    }
    const timeFilter = {};
    if (timeRange?.from)
        timeFilter.gte = new Date(timeRange.from);
    if (timeRange?.to)
        timeFilter.lte = new Date(timeRange.to);
    const [region, revenue, jobs, placements, consultants] = await Promise.all([
        prisma_1.prisma.region.findUnique({
            where: { id: targetRegionId },
            select: { id: true, name: true, code: true },
        }),
        prisma_1.prisma.regionalRevenue.aggregate({
            where: {
                region_id: targetRegionId,
                ...(Object.keys(timeFilter).length ? { period_start: timeFilter } : {}),
            },
            _sum: { total_revenue: true },
        }),
        prisma_1.prisma.job.count({
            where: {
                region_id: targetRegionId,
                ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
            },
        }),
        prisma_1.prisma.application.count({
            where: {
                job: { is: { region_id: targetRegionId } },
                status: 'HIRED',
                ...(Object.keys(timeFilter).length ? { updated_at: timeFilter } : {}),
            },
        }),
        prisma_1.prisma.consultant.count({
            where: {
                region_id: targetRegionId,
                status: 'ACTIVE',
            },
        }),
    ]);
    if (!region) {
        return { found: false, reason: 'Region not found.' };
    }
    return {
        found: true,
        region: {
            id: region.id,
            name: region.name,
            code: region.code,
        },
        metrics: {
            totalRevenue: revenue._sum.total_revenue || 0,
            totalJobs: jobs,
            totalPlacements: placements,
            activeConsultants: consultants,
        },
    };
}
// ============================================================================
// NEW CONSULTANT TOOLS
// ============================================================================
/**
 * Get companies the consultant is working with
 */
async function getMyCompanies(args, actor) {
    if (!assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
        return { found: false, reason: 'This tool is only available for consultants.' };
    }
    const { status } = exports.getMyCompaniesSchema.parse(args);
    const jobWhere = {
        assigned_consultant_id: actor.userId,
    };
    if (status === 'ACTIVE') {
        jobWhere.status = { in: ['OPEN'] }; // Use valid JobStatus enum
    }
    const jobs = await prisma_1.prisma.job.findMany({
        where: jobWhere,
        select: {
            company_id: true,
            company: {
                select: {
                    id: true,
                    name: true,
                    domain: true,
                },
            },
        },
        distinct: ['company_id'],
    });
    // Get additional stats for each company
    const companiesWithStats = await Promise.all(jobs.map(async (job) => {
        const [activeJobs, totalCandidates, hiredCount] = await Promise.all([
            prisma_1.prisma.job.count({
                where: {
                    company_id: job.company_id,
                    assigned_consultant_id: actor.userId,
                    status: { in: ['OPEN'] },
                },
            }),
            prisma_1.prisma.application.count({
                where: {
                    job: {
                        is: {
                            company_id: job.company_id,
                            assigned_consultant_id: actor.userId,
                        },
                    },
                },
            }),
            prisma_1.prisma.application.count({
                where: {
                    job: {
                        is: {
                            company_id: job.company_id,
                            assigned_consultant_id: actor.userId,
                        },
                    },
                    status: 'HIRED',
                },
            }),
        ]);
        return {
            companyId: job.company.id,
            companyName: job.company.name,
            domain: job.company.domain,
            activeJobs,
            totalCandidates,
            placements: hiredCount,
        };
    }));
    return {
        found: true,
        total: companiesWithStats.length,
        companies: companiesWithStats,
    };
}
/**
 * Get candidates in consultant's pipeline
 */
async function getMyCandidates(args, actor) {
    if (!assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
        return { found: false, reason: 'This tool is only available for consultants.' };
    }
    const { status, limit } = exports.getMyCandidatesSchema.parse(args);
    const applicationWhere = {
        job: {
            is: { assigned_consultant_id: actor.userId },
        },
    };
    if (status !== 'ALL') {
        applicationWhere.status = status;
    }
    const applications = await prisma_1.prisma.application.findMany({
        where: applicationWhere,
        include: {
            candidate: {
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone: true,
                },
            },
            job: {
                select: {
                    id: true,
                    title: true,
                    job_code: true,
                    company: { select: { name: true } },
                },
            },
        },
        orderBy: { updated_at: 'desc' },
        take: limit,
    });
    return {
        found: true,
        total: applications.length,
        candidates: applications.map((app) => ({
            candidateId: app.candidate.id,
            candidateName: `${app.candidate.first_name} ${app.candidate.last_name}`.trim(),
            email: app.candidate.email,
            phone: app.candidate.phone,
            applicationId: app.id,
            jobTitle: app.job.title,
            jobCode: app.job.job_code,
            companyName: app.job.company?.name,
            status: app.status,
            stage: app.stage,
            score: app.score,
            appliedDate: app.applied_date,
            lastUpdated: app.updated_at,
        })),
    };
}
/**
 * Get quick stats dashboard for consultant
 */
async function getMyQuickStats(args, actor) {
    if (!assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
        return { found: false, reason: 'This tool is only available for consultants.' };
    }
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [activeJobs, totalCandidates, interviewsThisWeek, pendingCommissions, recentPlacements] = await Promise.all([
        prisma_1.prisma.job.count({
            where: {
                assigned_consultant_id: actor.userId,
                status: { in: ['OPEN'] },
            },
        }),
        prisma_1.prisma.application.count({
            where: {
                job: { is: { assigned_consultant_id: actor.userId } },
                status: { in: ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER'] },
            },
        }),
        prisma_1.prisma.videoInterview.count({
            where: {
                application: {
                    is: {
                        job: { is: { assigned_consultant_id: actor.userId } },
                    },
                },
                scheduled_date: {
                    gte: today,
                    lte: sevenDaysFromNow,
                },
                status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            },
        }),
        prisma_1.prisma.commission.aggregate({
            where: {
                consultant_id: actor.userId,
                status: 'PENDING',
            },
            _sum: { amount: true },
            _count: { id: true },
        }),
        prisma_1.prisma.application.count({
            where: {
                job: { is: { assigned_consultant_id: actor.userId } },
                status: 'HIRED',
                updated_at: { gte: thirtyDaysAgo },
            },
        }),
    ]);
    return {
        found: true,
        summary: {
            activeJobs,
            totalCandidatesInPipeline: totalCandidates,
            interviewsThisWeek,
            pendingCommissionsAmount: pendingCommissions._sum.amount || 0,
            pendingCommissionsCount: pendingCommissions._count.id,
            recentPlacements: recentPlacements,
        },
    };
}
// ============================================================================
// NEW ADMIN SEARCH TOOLS
// ============================================================================
/**
 * Search consultants by name, email, or region
 */
async function searchConsultants(args, actor) {
    if (actor.actorType === 'COMPANY_USER') {
        return { found: false, reason: 'This tool is only available for HRM8 users.' };
    }
    const { query, regionId, limit } = exports.searchConsultantsSchema.parse(args);
    // Build search conditions
    const searchConditions = [
        { email: { contains: query, mode: 'insensitive' } },
        { first_name: { contains: query, mode: 'insensitive' } },
        { last_name: { contains: query, mode: 'insensitive' } },
    ];
    const where = {
        OR: searchConditions,
    };
    // Apply region scope for non-global admins
    const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length > 0) {
        where.region_id = { in: regionScope };
    }
    // Apply specific region filter if provided
    if (regionId) {
        where.region_id = regionId;
    }
    const consultants = await prisma_1.prisma.consultant.findMany({
        where,
        include: {
            region: { select: { name: true, code: true } },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        take: limit,
    });
    return {
        found: true,
        total: consultants.length,
        consultants: consultants.map((c) => ({
            id: c.id,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            email: c.email,
            phone: c.phone,
            status: c.status,
            regionName: c.region?.name,
            regionCode: c.region?.code,
        })),
    };
}
/**
 * Search candidates by name or email (improved global search)
 */
async function searchCandidatesByName(args, actor) {
    const { query, limit } = exports.searchCandidatesByNameSchema.parse(args);
    // Build search conditions
    const searchConditions = [
        { email: { contains: query, mode: 'insensitive' } },
        { first_name: { contains: query, mode: 'insensitive' } },
        { last_name: { contains: query, mode: 'insensitive' } },
    ];
    // For consultants: only search candidates from their assigned jobs
    let applicationScope = {};
    if (actor.actorType === 'COMPANY_USER') {
        applicationScope = {
            applications: {
                some: {
                    job: { is: { company_id: actor.companyId } },
                },
            },
        };
    }
    else {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (assistant_access_control_1.AssistantAccessControl.isConsultant(actor)) {
            applicationScope = {
                applications: {
                    some: {
                        job: { is: { assigned_consultant_id: actor.userId } },
                    },
                },
            };
        }
        else if (regionScope && regionScope.length > 0) {
            applicationScope = {
                applications: {
                    some: {
                        job: { is: { region_id: { in: regionScope } } },
                    },
                },
            };
        }
    }
    const candidates = await prisma_1.prisma.candidate.findMany({
        where: {
            OR: searchConditions,
            ...applicationScope,
        },
        include: {
            applications: {
                include: {
                    job: {
                        select: {
                            title: true,
                            job_code: true,
                            company: { select: { name: true } },
                        },
                    },
                },
                orderBy: { updated_at: 'desc' },
                take: 3,
            },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        take: limit,
    });
    return {
        found: true,
        total: candidates.length,
        candidates: candidates.map((c) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            email: c.email,
            phone: c.phone,
            status: c.status,
            recentApplications: c.applications.map((app) => ({
                jobTitle: app.job.title,
                jobCode: app.job.job_code,
                companyName: app.job.company?.name,
                status: app.status,
                stage: app.stage,
                updatedAt: app.updated_at,
            })),
        })),
    };
}
// ============================================================================
// ADMIN MONITORING TOOLS
// ============================================================================
/**
 * Get recent audit logs for system activity monitoring
 */
async function getRecentAuditLogs(args, actor) {
    if (actor.actorType === 'COMPANY_USER' || actor.actorType === 'CONSULTANT') {
        return { found: false, reason: 'This tool is only available for administrators.' };
    }
    const { limit, entityType, actionType } = exports.getRecentAuditLogsSchema.parse(args);
    const where = {};
    // Apply entity type filter
    if (entityType !== 'ALL') {
        where.entity_type = entityType;
    }
    // Apply action type filter  
    if (actionType !== 'ALL') {
        where.action = actionType;
    }
    const auditLogs = await prisma_1.prisma.auditLog.findMany({
        where,
        orderBy: { performed_at: 'desc' },
        take: limit,
    });
    return {
        found: true,
        total: auditLogs.length,
        logs: auditLogs.map((log) => ({
            id: log.id,
            entityType: log.entity_type,
            entityId: log.entity_id,
            action: log.action,
            description: log.description,
            performedBy: log.performed_by_email || log.performed_by || 'System',
            performedAt: log.performed_at,
            changes: log.changes,
        })),
    };
}
/**
 * Get revenue analytics including splits, cash movement, and company breakdowns
 */
async function getRevenueAnalytics(args, actor) {
    if (actor.actorType === 'COMPANY_USER' || actor.actorType === 'CONSULTANT') {
        return { found: false, reason: 'This tool is only available for administrators.' };
    }
    const { timeRange, regionId, includeCompanyBreakdown } = exports.getRevenueAnalyticsSchema.parse(args);
    // Build simple time filter inline
    const now = new Date();
    let startDate;
    switch (timeRange) {
        case 'TODAY':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'THIS_WEEK':
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'THIS_MONTH':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'THIS_QUARTER':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
        case 'THIS_YEAR':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
    }
    // Determine region scope
    let targetRegionId = regionId;
    if (!targetRegionId) {
        const regionScope = assistant_access_control_1.AssistantAccessControl.getRegionScope(actor);
        if (regionScope && regionScope.length === 1) {
            targetRegionId = regionScope[0];
        }
    }
    // Query commission data  
    const commissionWhere = {};
    // Add time filter if specified
    if (startDate) {
        commissionWhere.created_at = { gte: startDate };
    }
    // Add region filter if specified
    if (targetRegionId) {
        commissionWhere.consultant = {
            is: { region_id: targetRegionId },
        };
    }
    const [totalCommissions, commissionsByStatus] = await Promise.all([
        // Total commissions aggregate (using only available fields)
        prisma_1.prisma.commission.aggregate({
            where: commissionWhere,
            _sum: { amount: true, rate: true },
            _count: true,
        }),
        // Commissions grouped by status
        prisma_1.prisma.commission.groupBy({
            by: ['status'],
            where: commissionWhere,
            _sum: { amount: true },
            _count: true,
        }),
    ]);
    const result = {
        found: true,
        timeRange,
        summary: {
            totalRevenue: totalCommissions._sum?.amount || 0,
            totalCommissions: totalCommissions._count || 0,
            averageCommissionRate: totalCommissions._sum?.rate || 0,
        },
        commissionsByStatus: commissionsByStatus.map((group) => ({
            status: group.status,
            amount: group._sum?.amount || 0,
            count: group._count || 0,
        })),
    };
    // Company breakdown if requested (with limit to protect context)
    if (includeCompanyBreakdown) {
        const companyRevenue = await prisma_1.prisma.commission.groupBy({
            by: ['job_id'],
            where: commissionWhere,
            _sum: { amount: true },
            _count: true,
        });
        // Fetch job details to get company info (limit to top results only)
        const jobIds = companyRevenue
            .map((cr) => cr.job_id)
            .filter((id) => id !== null)
            .slice(0, 50); // Limit to protect context
        if (jobIds.length > 0) {
            const jobs = await prisma_1.prisma.job.findMany({
                where: { id: { in: jobIds } },
                select: {
                    id: true,
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            const jobMap = new Map(jobs.map((j) => [j.id, j.company]));
            // Aggregate by company
            const companyMap = new Map();
            companyRevenue.forEach((cr) => {
                if (cr.job_id) {
                    const company = jobMap.get(cr.job_id);
                    if (company) {
                        const existing = companyMap.get(company.id) || { name: company.name, revenue: 0, commissionCount: 0 };
                        existing.revenue += cr._sum?.amount || 0;
                        existing.commissionCount += cr._count || 0;
                        companyMap.set(company.id, existing);
                    }
                }
            });
            result.companyBreakdown = Array.from(companyMap.entries())
                .map(([companyId, data]) => ({
                companyId,
                companyName: data.name,
                revenue: data.revenue,
                commissionCount: data.commissionCount,
            }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 15); // Limit to top 15 companies to protect context
        }
    }
    // Include HRM8 vs Licensee share insights if requested
    if (args.includeSharingInsights) {
        const revenueShareData = await prisma_1.prisma.regionalRevenue.aggregate({
            where: {
                ...(targetRegionId ? { region_id: targetRegionId } : {}),
                ...(startDate ? { period_start: { gte: startDate } } : {}),
            },
            _sum: {
                total_revenue: true,
                licensee_share: true,
                hrm8_share: true,
            },
            _count: true,
        });
        if (revenueShareData._count > 0) {
            result.revenueSharing = {
                totalRecognizedRevenue: revenueShareData._sum.total_revenue || 0,
                licenseeShare: revenueShareData._sum.licensee_share || 0,
                hrm8Share: revenueShareData._sum.hrm8_share || 0,
                note: 'Revenue sharing data is based on finalized regional revenue records.',
            };
        }
        else {
            // Calculate from live commissions if finalized revenue reports are unavailable
            const commissionShareData = await prisma_1.prisma.commission.aggregate({
                where: commissionWhere,
                _sum: { amount: true },
                _count: true,
            });
            const totalRevenue = commissionShareData._sum.amount || 0;
            // Default to 80/20 split for estimation when region-specific data is unavailable in this aggregate view
            const estimatedLicenseeShare = totalRevenue * 0.8;
            const estimatedHrm8Share = totalRevenue * 0.2;
            if (totalRevenue > 0) {
                result.revenueSharing = {
                    totalRecognizedRevenue: totalRevenue,
                    licenseeShare: estimatedLicenseeShare,
                    hrm8Share: estimatedHrm8Share,
                };
            }
        }
    }
    return result;
}
/**
 * Get leaderboard of top performing regional licensees
 */
async function getLicenseeLeaderboard(args, actor) {
    // Only Global Admins can see the full leaderboard
    if (!assistant_access_control_1.AssistantAccessControl.isGlobalAdmin(actor)) {
        return { found: false, reason: 'This tool is restricted to Global Administrators.' };
    }
    const { timeRange, metric, limit } = exports.getLicenseeLeaderboardSchema.parse(args);
    // Build time filter
    const now = new Date();
    let startDate;
    switch (timeRange) {
        case 'THIS_MONTH':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'THIS_QUARTER':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
        case 'THIS_YEAR':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        // ALL_TIME is default (startDate undefined)
    }
    const where = {};
    if (startDate) {
        where.period_start = { gte: startDate };
    }
    // Try fetching from pre-aggregated RegionalRevenue first
    const leaderboardData = await prisma_1.prisma.regionalRevenue.groupBy({
        by: ['region_id'],
        where,
        _sum: {
            total_revenue: true,
            hrm8_share: true,
            licensee_share: true,
        },
    });
    let rankedLicensees = [];
    // If RegionalRevenue has data, use it
    if (leaderboardData.length > 0) {
        const regionIds = leaderboardData.map((d) => d.region_id);
        const regions = await prisma_1.prisma.region.findMany({
            where: { id: { in: regionIds } },
            select: {
                id: true,
                name: true,
                licensee: {
                    select: {
                        id: true,
                        name: true,
                        legal_entity_name: true,
                    },
                },
            },
        });
        const regionMap = new Map(regions.map((r) => [r.id, r]));
        rankedLicensees = leaderboardData.map((data) => {
            const region = regionMap.get(data.region_id);
            return {
                regionName: region?.name || 'Unknown Region',
                licenseeName: region?.licensee?.name || region?.licensee?.legal_entity_name || 'Unassigned',
                totalRevenue: data._sum.total_revenue || 0,
                hrm8Share: data._sum.hrm8_share || 0,
                licenseeShare: data._sum.licensee_share || 0,
                source: 'RegionalRevenue (Finalized)',
            };
        });
    }
    else {
        // Aggregating directly from Commission table for real-time insights
        // This ensures data availability if RegionalRevenue (finalized reports) are not yet generated
        const commissionWhere = {};
        if (startDate) {
            commissionWhere.created_at = { gte: startDate };
        }
        // Get commissions grouped by region
        const commissionData = await prisma_1.prisma.commission.groupBy({
            by: ['region_id'],
            where: commissionWhere,
            _sum: {
                amount: true,
            },
            _count: true,
        });
        if (commissionData.length > 0) {
            const regionIds = commissionData.map((d) => d.region_id);
            const regions = await prisma_1.prisma.region.findMany({
                where: { id: { in: regionIds } },
                select: {
                    id: true,
                    name: true,
                    licensee: {
                        select: {
                            id: true,
                            name: true,
                            legal_entity_name: true,
                            revenue_share_percent: true, // Needed to estimate split
                        },
                    },
                },
            });
            const regionMap = new Map(regions.map((r) => [r.id, r]));
            rankedLicensees = commissionData.map((data) => {
                const region = regionMap.get(data.region_id);
                const totalRevenue = data._sum.amount || 0;
                // Precise split based on licensee's configured share percentage
                // Default to standard 80/20 (Licensee/HRM8) if not explicitly set
                const licenseeSharePercent = region?.licensee?.revenue_share_percent ?? 80;
                const licenseeShare = (totalRevenue * licenseeSharePercent) / 100;
                const hrm8Share = totalRevenue - licenseeShare;
                return {
                    regionName: region?.name || 'Unknown Region',
                    licenseeName: region?.licensee?.name || region?.licensee?.legal_entity_name || 'Unassigned',
                    totalRevenue,
                    hrm8Share,
                    licenseeShare,
                    placementCount: data._count,
                    source: 'Live Commissions',
                };
            });
        }
    }
    // Sort and limit final results
    rankedLicensees.sort((a, b) => {
        if (metric === 'HRM8_SHARE')
            return b.hrm8Share - a.hrm8Share;
        if (metric === 'PLACEMENTS')
            return (b.placementCount || 0) - (a.placementCount || 0);
        return b.totalRevenue - a.totalRevenue;
    });
    return {
        found: rankedLicensees.length > 0,
        timeRange,
        metric,
        leaderboard: rankedLicensees.slice(0, limit),
    };
}
