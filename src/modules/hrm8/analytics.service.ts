import { BaseService } from '../../core/service';
import { AnalyticsRepository } from './analytics.repository';
import { HttpException } from '../../core/http-exception';

export class AnalyticsService extends BaseService {
    constructor(private analyticsRepository: AnalyticsRepository) {
        super();
    }

    async getOperationalStats(regionId: string, assignedRegionIds?: string[]) {
        if (assignedRegionIds && assignedRegionIds.length > 0 && !assignedRegionIds.includes(regionId)) {
            throw new HttpException(403, 'Access denied to this region');
        }

        const [stats, trendsData] = await Promise.all([
            this.analyticsRepository.getOperationalStats(regionId),
            this.analyticsRepository.getHistoricalTrends(regionId)
        ]);

        // Transform trends to match frontend expectation
        const trends = {
            openJobs: trendsData.map(t => ({ name: t.month, value: t.jobs })),
            activeConsultants: trendsData.map(t => ({ name: t.month, value: t.consultants })),
            placements: trendsData.map(t => ({ name: t.month, value: t.placements }))
        };

        return { ...stats, trends };
    }

    async getRegionalCompanies(regionId: string, status?: string, assignedRegionIds?: string[]) {
        if (assignedRegionIds && assignedRegionIds.length > 0 && !assignedRegionIds.includes(regionId)) {
            throw new HttpException(403, 'Access denied to this region');
        }

        return this.analyticsRepository.getRegionalCompanies(regionId, status);
    }

    async getPlatformOverview(filters: { startDate?: string; endDate?: string; companyId?: string; regionId?: string }) {
        const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
        const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

        const { jobs, analytics, totalApplications, uniqueCompaniesCount } = await this.analyticsRepository.getPlatformOverview(
            startDate,
            endDate,
            filters.companyId,
            filters.regionId
        );

        // Aggregate metrics
        const sources = ['HRM8_BOARD', 'CAREER_PAGE', 'EXTERNAL', 'CANDIDATE_PORTAL'];
        const overview = {
            totalJobs: jobs.length,
            activeJobs: jobs.filter(j => j.status === 'OPEN').length,
            totalCompanies: uniqueCompaniesCount,
            totalViews: jobs.reduce((sum, j) => sum + (j.views_count || 0), 0),
            totalClicks: jobs.reduce((sum, j) => sum + (j.clicks_count || 0), 0),
            totalApplications,
            conversionRates: {
                viewToClick: 0,
                clickToApply: 0,
                viewToApply: 0,
            },
            bySource: {} as Record<string, { views: number; clicks: number }>,
        };

        // Initialize sources
        sources.forEach(source => {
            overview.bySource[source] = { views: 0, clicks: 0 };
        });

        // Fill from analytics
        analytics.forEach(row => {
            const source = row.source || 'HRM8_BOARD';
            if (!overview.bySource[source]) {
                overview.bySource[source] = { views: 0, clicks: 0 };
            }
            if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
                overview.bySource[source].views += row._count.id;
            } else if (row.event_type === 'APPLY_CLICK') {
                overview.bySource[source].clicks += row._count.id;
            }
        });

        // Calculate conversion rates
        if (overview.totalViews > 0) {
            overview.conversionRates.viewToClick = Math.round((overview.totalClicks / overview.totalViews) * 100 * 10) / 10;
            overview.conversionRates.viewToApply = Math.round((overview.totalApplications / overview.totalViews) * 100 * 10) / 10;
        }
        if (overview.totalClicks > 0) {
            overview.conversionRates.clickToApply = Math.round((overview.totalApplications / overview.totalClicks) * 100 * 10) / 10;
        }

        return overview;
    }

    async getPlatformTrends(period: string = '30d', filters: { companyId?: string; regionId?: string }) {
        const endDate = new Date();
        const startDate = new Date();

        if (period === '7d') startDate.setDate(startDate.getDate() - 7);
        else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
        else if (period === '90d') startDate.setDate(startDate.getDate() - 90);

        const { analytics, applications } = await this.analyticsRepository.getPlatformTrends(
            startDate,
            endDate,
            filters.companyId,
            filters.regionId
        );

        // Group by date
        const dailyData: Record<string, { views: number; clicks: number; applies: number }> = {};
        const current = new Date(startDate);
        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            dailyData[dateKey] = { views: 0, clicks: 0, applies: 0 };
            current.setDate(current.getDate() + 1);
        }

        // Fill analytics data
        analytics.forEach(row => {
            const dateKey = row.created_at.toISOString().split('T')[0];
            if (dailyData[dateKey]) {
                if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
                    dailyData[dateKey].views++;
                } else if (row.event_type === 'APPLY_CLICK') {
                    dailyData[dateKey].clicks++;
                }
            }
        });

        // Fill application data
        applications.forEach(app => {
            const dateKey = app.created_at.toISOString().split('T')[0];
            if (dailyData[dateKey]) {
                dailyData[dateKey].applies++;
            }
        });

        const trends = Object.entries(dailyData)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totals = trends.reduce(
            (acc, day) => ({
                views: acc.views + day.views,
                clicks: acc.clicks + day.clicks,
                applies: acc.applies + day.applies,
            }),
            { views: 0, clicks: 0, applies: 0 }
        );

        return {
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            trends,
            totals,
        };
    }

    async getTopPerformingCompanies(limit: number = 10, regionId?: string) {
        const companiesStats = await this.analyticsRepository.getTopPerformingCompanies(limit, regionId);

        const companyIds = companiesStats.map(c => c.company_id);
        const companies = await this.analyticsRepository.getCompaniesByIds(companyIds);
        const companyMap = new Map(companies.map(c => [c.id, c]));

        // Get application counts per job -> aggregate by company
        // Since we don't have direct company_id in Application (it's through Job), repository needs to handle this.
        // Actually, existing implementation logic:

        // 1. Get all jobs involved
        // The repository method returned aggregated stats by company_id based on Jobs.
        // But for applications, we need to query applications for those companies.

        // Let's modify approach: query applications by job IDs of these companies?
        // OR better: in repository logic we saw it queries applications grouped by job_id.
        // Let's implement that.

        // We need all jobs for these companies to count total applications for the company?
        // The stats calculation in legacy controller:
        /*
        const applicationCounts = await prisma.application.groupBy({ by: ['job_id'], ... });
        const jobToCompany ...
        */

        // Since this logic is complex and involves multiple queries, it might be better in Service or split in Repository.
        // Let's fetch the applications count per company here.

        // We know which companies are top by views/clicks.
        // For these top companies, let's fetch their jobs and count applications?
        // Wait, the sorting order depends on views, not applications. So we have the top companies.
        // NOW we need applications count for THEM.

        // Get all job IDs for these companies?
        // The simple way:
        // We have `companiesStats` which has `company_id`.
        // Let's get all jobs for these `companyIds`.

        // To avoid N+1, let's use a helper in repository to get jobs by company IDs?
        // Or just `getJobsByIds`? No, we need `getJobsByCompanyIds`.

        // Let's assume we can get application counts per job for all jobs of these companies.
        // But that's potentially many jobs.

        // Alternative: get all applications for jobs where company_id in companyIds?
        // Application -> Job -> Company.
        // Prisma: prisma.application.count({ where: { job: { company_id: { in: companyIds } } } })?
        // No we need group by company.

        // Let's iterate and do per-company count? If limit is small (10), it is 10 queries. Acceptable.
        // Or fetch all applications for these companies and group in memory.

        const result = companiesStats
            .map(stat => {
                const company = companyMap.get(stat.company_id);
                return {
                    companyId: stat.company_id,
                    companyName: company?.name || 'Unknown',
                    hasCareerPage: company?.careers_page_status === 'APPROVED',
                    totalJobs: stat._count.id,
                    totalViews: stat._sum.views_count || 0,
                    totalClicks: stat._sum.clicks_count || 0,
                    totalApplications: 0, // TODO: Implement fetch
                };
            })
            .sort((a, b) => b.totalViews - a.totalViews);

        return result;
    }
}
