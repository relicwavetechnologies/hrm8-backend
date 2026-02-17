"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class AnalyticsRepository {
    async getOperationalStats(regionId) {
        const regionFilter = regionId ? { region_id: regionId } : {};
        const [openJobsCount, activeConsultantsCount, placementsThisMonth, activeEmployerCount, newEmployerCount, inactiveEmployerCount] = await Promise.all([
            prisma_1.prisma.job.count({
                where: { ...regionFilter, status: 'OPEN' }
            }),
            prisma_1.prisma.consultant.count({
                where: { ...regionFilter, status: 'ACTIVE' }
            }),
            prisma_1.prisma.commission.count({
                where: {
                    ...regionFilter,
                    type: 'PLACEMENT',
                    created_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }
            }),
            prisma_1.prisma.company.count({
                where: {
                    ...regionFilter,
                    jobs: { some: { status: 'OPEN' } }
                }
            }),
            // New Employers: Joined this month
            prisma_1.prisma.company.count({
                where: {
                    ...regionFilter,
                    created_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }
            }),
            // Inactive Employers: No open jobs
            prisma_1.prisma.company.count({
                where: {
                    ...regionFilter,
                    jobs: { none: { status: 'OPEN' } }
                }
            })
        ]);
        return {
            openJobsCount,
            activeConsultantsCount,
            placementsThisMonth,
            activeEmployerCount,
            newEmployerCount,
            inactiveEmployerCount
        };
    }
    async getHistoricalTrends(regionId) {
        const trends = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const regionFilter = regionId ? { region_id: regionId } : {};
            const [jobs, consultants, placements] = await Promise.all([
                prisma_1.prisma.job.count({ where: { ...regionFilter, status: 'OPEN', created_at: { gte: monthStart, lte: monthEnd } } }),
                prisma_1.prisma.consultant.count({ where: { ...regionFilter, status: 'ACTIVE', created_at: { gte: monthStart, lte: monthEnd } } }),
                prisma_1.prisma.commission.count({ where: { ...regionFilter, type: 'PLACEMENT', created_at: { gte: monthStart, lte: monthEnd } } })
            ]);
            trends.push({
                month: monthStart.toLocaleString('default', { month: 'short' }),
                jobs,
                consultants,
                placements
            });
        }
        return trends;
    }
    async getRegionalCompanies(regionId, status) {
        const where = regionId ? { region_id: regionId } : {};
        if (status === 'new') {
            where.created_at = { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) };
        }
        return prisma_1.prisma.company.findMany({
            where,
            include: {
                _count: {
                    select: { jobs: { where: { status: 'OPEN' } } }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }
    async getPlatformOverview(startDate, endDate, companyId, regionId) {
        // Build filters
        const dateFilter = {};
        if (startDate)
            dateFilter.gte = startDate;
        if (endDate)
            dateFilter.lte = endDate;
        const hasDateFilter = Object.keys(dateFilter).length > 0;
        const jobFilter = {};
        if (companyId)
            jobFilter.company_id = companyId;
        if (regionId)
            jobFilter.region_id = regionId;
        // Get jobs
        const jobs = await prisma_1.prisma.job.findMany({
            where: jobFilter,
            select: {
                id: true,
                status: true,
                views_count: true,
                clicks_count: true,
                company_id: true,
            },
        });
        const jobIds = jobs.map(j => j.id);
        // Get analytics
        const analytics = await prisma_1.prisma.jobAnalytics.groupBy({
            by: ['event_type', 'source'],
            where: {
                job_id: { in: jobIds },
                ...(hasDateFilter ? { created_at: dateFilter } : {}),
            },
            _count: { id: true },
        });
        // Get total applications
        const totalApplications = await prisma_1.prisma.application.count({
            where: {
                job_id: { in: jobIds },
                ...(hasDateFilter ? { created_at: dateFilter } : {}),
            },
        });
        const uniqueCompanies = new Set(jobs.map(j => j.company_id));
        return {
            jobs,
            analytics,
            totalApplications,
            uniqueCompaniesCount: uniqueCompanies.size,
        };
    }
    async getPlatformTrends(startDate, endDate, companyId, regionId) {
        const jobFilter = {};
        if (companyId)
            jobFilter.company_id = companyId;
        if (regionId)
            jobFilter.region_id = regionId;
        const jobs = await prisma_1.prisma.job.findMany({
            where: jobFilter,
            select: { id: true },
        });
        const jobIds = jobs.map(j => j.id);
        const analytics = await prisma_1.prisma.jobAnalytics.findMany({
            where: {
                job_id: { in: jobIds },
                created_at: { gte: startDate, lte: endDate },
            },
            select: {
                event_type: true,
                created_at: true,
            },
        });
        const applications = await prisma_1.prisma.application.findMany({
            where: {
                job_id: { in: jobIds },
                created_at: { gte: startDate, lte: endDate },
            },
            select: { created_at: true },
        });
        return { analytics, applications };
    }
    async getTopPerformingCompanies(limit, regionId) {
        const jobFilter = {};
        if (regionId)
            jobFilter.region_id = regionId;
        return prisma_1.prisma.job.groupBy({
            by: ['company_id'],
            where: jobFilter,
            _sum: {
                views_count: true,
                clicks_count: true,
            },
            _count: {
                id: true,
            },
        });
    }
    async getCompaniesByIds(ids) {
        return prisma_1.prisma.company.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                name: true,
                careers_page_status: true,
            },
        });
    }
    async getApplicationsByJobIds(jobIds) {
        return prisma_1.prisma.application.groupBy({
            by: ['job_id'],
            _count: { id: true },
        });
    }
    async getJobsByIds(ids) {
        return prisma_1.prisma.job.findMany({
            where: { id: { in: ids } },
            select: { id: true, company_id: true },
        });
    }
    async getApplicationCountsByCompanyIds(companyIds) {
        const jobs = await prisma_1.prisma.job.findMany({
            where: { company_id: { in: companyIds } },
            select: {
                company_id: true,
                _count: {
                    select: { applications: true }
                }
            }
        });
        const appCounts = new Map();
        jobs.forEach(job => {
            const current = appCounts.get(job.company_id) || 0;
            appCounts.set(job.company_id, current + job._count.applications);
        });
        return appCounts;
    }
    async getJobBoardStats(params) {
        const where = {};
        if (params.regionId) {
            where.region_id = params.regionId;
        }
        else if (params.regionIds && params.regionIds.length > 0) {
            where.region_id = { in: params.regionIds };
        }
        const [total, companies] = await Promise.all([
            prisma_1.prisma.company.count({ where }),
            prisma_1.prisma.company.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    careers_page_logo: true,
                },
                orderBy: { name: 'asc' },
                skip: (params.page - 1) * params.limit,
                take: params.limit,
            }),
        ]);
        const companyIds = companies.map((company) => company.id);
        if (companyIds.length === 0) {
            return { companies: [], jobStats: [], total };
        }
        const jobStats = await prisma_1.prisma.job.groupBy({
            by: ['company_id', 'status'],
            where: { company_id: { in: companyIds } },
            _count: {
                id: true
            },
            _sum: {
                views_count: true,
                clicks_count: true
            }
        });
        return { companies, jobStats, total };
    }
}
exports.AnalyticsRepository = AnalyticsRepository;
