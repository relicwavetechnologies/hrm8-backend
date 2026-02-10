import { BaseService } from '../../core/service';
import { AnalyticsRepository } from './analytics.repository';
import { HttpException } from '../../core/http-exception';

export class AnalyticsService extends BaseService {
    constructor(private analyticsRepository: AnalyticsRepository) {
        super();
    }

    async getOperationalStats(
        regionId: string,
        assignedRegionIds?: string[],
        options?: { includeTrends?: boolean }
    ) {
        if (assignedRegionIds && assignedRegionIds.length > 0) {
            const isAll = regionId === 'all';
            if (!isAll && !assignedRegionIds.includes(regionId)) {
                throw new HttpException(403, 'Access denied to this region');
            }
        }

        const statsRegionId = regionId === 'all' ? undefined : regionId;
        const includeTrends = options?.includeTrends !== false;

        const [stats, trendsData] = await Promise.all([
            this.analyticsRepository.getOperationalStats(statsRegionId),
            includeTrends ? this.analyticsRepository.getHistoricalTrends(statsRegionId) : Promise.resolve([])
        ]);

        // Transform to snake_case for frontend consistency
        const trends = {
            open_jobs: trendsData.map(t => ({ name: t.month, value: t.jobs })),
            active_consultants: trendsData.map(t => ({ name: t.month, value: t.consultants })),
            placements: trendsData.map(t => ({ name: t.month, value: t.placements }))
        };

        return {
            open_jobs_count: stats.openJobsCount,
            active_consultants_count: stats.activeConsultantsCount,
            placements_this_month: stats.placementsThisMonth,
            active_employer_count: stats.activeEmployerCount,
            new_employer_count: stats.newEmployerCount,
            inactive_employer_count: stats.inactiveEmployerCount,
            trends
        };
    }

    async getRegionalCompanies(regionId: string, status?: string, assignedRegionIds?: string[]) {
        if (assignedRegionIds && assignedRegionIds.length > 0) {
            const isAll = regionId === 'all';
            if (!isAll && !assignedRegionIds.includes(regionId)) {
                throw new HttpException(403, 'Access denied to this region');
            }
        }

        const resolvedRegionId = regionId === 'all' ? undefined : regionId;
        return this.analyticsRepository.getRegionalCompanies(resolvedRegionId as any, status);
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
            total_jobs: jobs.length,
            active_jobs: jobs.filter(j => j.status === 'OPEN').length,
            total_companies: uniqueCompaniesCount,
            total_views: jobs.reduce((sum, j) => sum + (j.views_count || 0), 0),
            total_clicks: jobs.reduce((sum, j) => sum + (j.clicks_count || 0), 0),
            total_applications: totalApplications,
            conversion_rates: {
                view_to_click: 0,
                click_to_apply: 0,
                view_to_apply: 0,
            },
            by_source: {} as Record<string, { views: number; clicks: number }>,
        };

        // Initialize sources
        sources.forEach(source => {
            overview.by_source[source] = { views: 0, clicks: 0 };
        });

        // Fill from analytics
        analytics.forEach(row => {
            const source = row.source || 'HRM8_BOARD';
            if (!overview.by_source[source]) {
                overview.by_source[source] = { views: 0, clicks: 0 };
            }
            if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
                overview.by_source[source].views += row._count.id;
            } else if (row.event_type === 'APPLY_CLICK') {
                overview.by_source[source].clicks += row._count.id;
            }
        });

        // Calculate conversion rates
        if (overview.total_views > 0) {
            overview.conversion_rates.view_to_click = Math.round((overview.total_clicks / overview.total_views) * 100 * 10) / 10;
            overview.conversion_rates.view_to_apply = Math.round((overview.total_applications / overview.total_views) * 100 * 10) / 10;
        }
        if (overview.total_clicks > 0) {
            overview.conversion_rates.click_to_apply = Math.round((overview.total_applications / overview.total_clicks) * 100 * 10) / 10;
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

        // Fetch application counts
        const appCountsMap = await this.analyticsRepository.getApplicationCountsByCompanyIds(companyIds);

        const result = companiesStats
            .map(stat => {
                const company = companyMap.get(stat.company_id);
                return {
                    company_id: stat.company_id,
                    company_name: company?.name || 'Unknown',
                    has_career_page: company?.careers_page_status === 'APPROVED',
                    total_jobs: stat._count.id,
                    total_views: stat._sum.views_count || 0,
                    total_clicks: stat._sum.clicks_count || 0,
                    total_applications: appCountsMap.get(stat.company_id) || 0,
                };
            })
            .sort((a, b) => b.total_views - a.total_views);

        return result;
    }

    async getJobBoardStats(params?: {
        regionId?: string;
        assignedRegionIds?: string[];
        page?: number;
        limit?: number;
    }) {
        const page = params?.page && params.page > 0 ? params.page : 1;
        const limit = params?.limit && params.limit > 0 ? params.limit : 10;
        const regionId = params?.regionId && params.regionId !== 'all' ? params.regionId : undefined;
        const assignedRegionIds = params?.assignedRegionIds;

        if (assignedRegionIds && assignedRegionIds.length > 0 && regionId && !assignedRegionIds.includes(regionId)) {
            throw new HttpException(403, 'Access denied to this region');
        }

        const { companies, jobStats, total } = await this.analyticsRepository.getJobBoardStats({
            regionId,
            regionIds: !regionId ? assignedRegionIds : undefined,
            page,
            limit,
        });

        // Map stats by companyId
        const statsMap = new Map<string, { total: number; active: number; onHold: number; views: number; clicks: number }>();

        jobStats.forEach(stat => {
            const current = statsMap.get(stat.company_id) || { total: 0, active: 0, onHold: 0, views: 0, clicks: 0 };

            const count = stat._count.id;
            const views = stat._sum.views_count || 0;
            const clicks = stat._sum.clicks_count || 0;

            current.total += count;
            current.views += views;
            current.clicks += clicks;

            if (stat.status === 'OPEN') {
                current.active += count;
            } else if (stat.status === 'ON_HOLD' || stat.status === 'DRAFT') { // Assuming statuses
                current.onHold += count;
            }

            statsMap.set(stat.company_id, current);
        });

        // Merge with all companies and map to snake_case for frontend
        const mappedCompanies = companies.map(company => {
            const stats = statsMap.get(company.id) || { total: 0, active: 0, onHold: 0, views: 0, clicks: 0 };
            return {
                id: company.id,
                name: company.name,
                domain: company.domain,
                logo: company.careers_page_logo,
                total_jobs: stats.total,
                active_jobs: stats.active,
                on_hold_jobs: stats.onHold,
                total_views: stats.views,
                total_clicks: stats.clicks
            };
        });

        return {
            companies: mappedCompanies,
            total,
            page,
            page_size: limit,
        };
    }
}
