import { prisma } from '../../utils/prisma';
import { JobStatus, ConsultantStatus, CommissionType } from '@prisma/client';

export class AnalyticsRepository {
    async getOperationalStats(regionId: string) {
        const regionFilter = (regionId && regionId !== 'all') ? { region_id: regionId } : {};

        const [
            openJobsCount,
            activeConsultantsCount,
            placementsThisMonth,
            activeEmployerCount,
            newEmployerCount,
            inactiveEmployerCount
        ] = await Promise.all([
            prisma.job.count({
                where: { ...regionFilter, status: 'OPEN' }
            }),
            prisma.consultant.count({
                where: { ...regionFilter, status: 'ACTIVE' }
            }),
            prisma.commission.count({
                where: {
                    ...regionFilter,
                    type: 'PLACEMENT',
                    created_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }
            }),
            prisma.company.count({
                where: {
                    ...regionFilter,
                    jobs: { some: { status: 'OPEN' } }
                }
            }),
            // New Employers: Joined this month
            prisma.company.count({
                where: {
                    ...regionFilter,
                    created_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                }
            }),
            // Inactive Employers: No open jobs
            prisma.company.count({
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

    async getHistoricalTrends(regionId: string) {
        const trends = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const regionFilter = (regionId && regionId !== 'all') ? { region_id: regionId } : {};

            const [jobs, consultants, placements] = await Promise.all([
                prisma.job.count({ where: { ...regionFilter, status: 'OPEN', created_at: { gte: monthStart, lte: monthEnd } } }),
                prisma.consultant.count({ where: { ...regionFilter, status: 'ACTIVE', created_at: { gte: monthStart, lte: monthEnd } } }),
                prisma.commission.count({ where: { ...regionFilter, type: 'PLACEMENT', created_at: { gte: monthStart, lte: monthEnd } } })
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

    async getRegionalCompanies(regionId: string, status?: string) {
        const where: any = { region_id: regionId };
        if (status === 'new') {
            where.created_at = { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) };
        }

        return prisma.company.findMany({
            where,
            include: {
                _count: {
                    select: { jobs: { where: { status: 'OPEN' } } }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async getPlatformOverview(startDate?: Date, endDate?: Date, companyId?: string, regionId?: string) {
        // Build filters
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;
        const hasDateFilter = Object.keys(dateFilter).length > 0;

        const jobFilter: any = {};
        if (companyId) jobFilter.company_id = companyId;
        if (regionId) jobFilter.region_id = regionId;

        // Get jobs
        const jobs = await prisma.job.findMany({
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
        const analytics = await prisma.jobAnalytics.groupBy({
            by: ['event_type', 'source'],
            where: {
                job_id: { in: jobIds },
                ...(hasDateFilter ? { created_at: dateFilter } : {}),
            },
            _count: { id: true },
        });

        // Get total applications
        const totalApplications = await prisma.application.count({
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

    async getPlatformTrends(startDate: Date, endDate: Date, companyId?: string, regionId?: string) {
        const jobFilter: any = {};
        if (companyId) jobFilter.company_id = companyId;
        if (regionId) jobFilter.region_id = regionId;

        const jobs = await prisma.job.findMany({
            where: jobFilter,
            select: { id: true },
        });
        const jobIds = jobs.map(j => j.id);

        const analytics = await prisma.jobAnalytics.findMany({
            where: {
                job_id: { in: jobIds },
                created_at: { gte: startDate, lte: endDate },
            },
            select: {
                event_type: true,
                created_at: true,
            },
        });

        const applications = await prisma.application.findMany({
            where: {
                job_id: { in: jobIds },
                created_at: { gte: startDate, lte: endDate },
            },
            select: { created_at: true },
        });

        return { analytics, applications };
    }

    async getTopPerformingCompanies(limit: number, regionId?: string) {
        const jobFilter: any = {};
        if (regionId) jobFilter.region_id = regionId;

        return prisma.job.groupBy({
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

    async getCompaniesByIds(ids: string[]) {
        return prisma.company.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                name: true,
                careers_page_status: true,
            },
        });
    }

    async getApplicationsByJobIds(jobIds: string[]) {
        return prisma.application.groupBy({
            by: ['job_id'],
            _count: { id: true },
        });
    }

    async getJobsByIds(ids: string[]) {
        return prisma.job.findMany({
            where: { id: { in: ids } },
            select: { id: true, company_id: true },
        });
    }
}
