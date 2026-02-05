import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';

export class AnalyticsService extends BaseService {
  /**
   * Get analytics breakdown for a specific job
   */
  async getJobAnalyticsBreakdown(
    jobId: string,
    companyId: string,
    filters?: { startDate?: string; endDate?: string }
  ) {
    // Verify job belongs to company
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        company_id: companyId,
      },
      select: { id: true, title: true, views_count: true, clicks_count: true },
    });

    if (!job) {
      throw new HttpException(404, 'Job not found');
    }

    // Build date filter
    const dateFilter: any = {};
    if (filters?.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      dateFilter.lte = new Date(filters.endDate);
    }

    const createdAtFilter = Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {};

    // Get analytics grouped by source and event type
    const analytics = await this.prisma.jobAnalytics.groupBy({
      by: ['event_type', 'source'],
      where: {
        job_id: jobId,
        ...createdAtFilter,
      },
      _count: {
        id: true,
      },
    });

    // Get applications count
    const applications = await this.prisma.application.count({
      where: {
        job_id: jobId,
        ...(filters?.startDate || filters?.endDate ? { created_at: dateFilter } : {}),
      },
    });

    // Transform into structured response
    const sources = ['HRM8_BOARD', 'CAREER_PAGE', 'EXTERNAL', 'CANDIDATE_PORTAL'];
    const breakdown = {
      views: {
        total: job.views_count || 0,
        bySource: {} as Record<string, number>,
      },
      clicks: {
        total: job.clicks_count || 0,
        bySource: {} as Record<string, number>,
      },
      applies: {
        total: applications,
        bySource: {} as Record<string, number>,
      },
    };

    // Initialize all sources to 0
    sources.forEach(source => {
      breakdown.views.bySource[source] = 0;
      breakdown.clicks.bySource[source] = 0;
      breakdown.applies.bySource[source] = 0;
    });

    // Fill in actual values from analytics
    analytics.forEach((row: any) => {
      const source = row.source || 'HRM8_BOARD';
      const count = row._count.id;

      if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
        breakdown.views.bySource[source] = (breakdown.views.bySource[source] || 0) + count;
      } else if (row.event_type === 'APPLY_CLICK') {
        breakdown.clicks.bySource[source] = (breakdown.clicks.bySource[source] || 0) + count;
      }
    });

    // Use Job table counts as authoritative source
    breakdown.views.total = job.views_count || 0;
    breakdown.clicks.total = job.clicks_count || 0;

    // Calculate tracked totals from JobAnalytics
    const trackedViews = Object.values(breakdown.views.bySource).reduce((a, b) => a + b, 0);
    const trackedClicks = Object.values(breakdown.clicks.bySource).reduce((a, b) => a + b, 0);

    // Add "UNKNOWN" source for any views/clicks not tracked in JobAnalytics
    if (breakdown.views.total > trackedViews) {
      breakdown.views.bySource['UNKNOWN'] = breakdown.views.total - trackedViews;
    }
    if (breakdown.clicks.total > trackedClicks) {
      breakdown.clicks.bySource['UNKNOWN'] = breakdown.clicks.total - trackedClicks;
    }

    // Get daily trend data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrends = await this.prisma.jobAnalytics.groupBy({
      by: ['event_type'],
      where: {
        job_id: jobId,
        created_at: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    return {
      jobId,
      jobTitle: job.title,
      breakdown,
      trends: dailyTrends,
    };
  }

  /**
   * Get daily analytics trends for a specific job
   */
  async getJobAnalyticsTrends(
    jobId: string,
    companyId: string,
    days: number = 30
  ) {
    // Verify job belongs to company
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        company_id: companyId,
      },
      select: { id: true },
    });

    if (!job) {
      throw new HttpException(404, 'Job not found');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all analytics events for the period
    const analytics = await this.prisma.jobAnalytics.findMany({
      where: {
        job_id: jobId,
        created_at: { gte: startDate, lte: endDate },
      },
      select: {
        event_type: true,
        created_at: true,
      },
    });

    // Group by date
    const dailyData: Record<string, { views: number; clicks: number }> = {};

    // Initialize all dates
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyData[dateKey] = { views: 0, clicks: 0 };
      current.setDate(current.getDate() + 1);
    }

    // Fill with actual data
    analytics.forEach((row: any) => {
      const dateKey = row.created_at.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
          dailyData[dateKey].views++;
        } else if (row.event_type === 'APPLY_CLICK') {
          dailyData[dateKey].clicks++;
        }
      }
    });

    // Convert to array for charting
    const trends = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        views: data.views,
        clicks: data.clicks,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      jobId,
      days,
      trends,
    };
  }

  /**
   * Get company-wide analytics overview
   */
  async getCompanyAnalyticsOverview(
    companyId: string,
    filters?: { startDate?: string; endDate?: string }
  ) {
    // Build date filter
    const dateFilter: any = {};
    if (filters?.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      dateFilter.lte = new Date(filters.endDate);
    }

    // Get company jobs
    const jobs = await this.prisma.job.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        title: true,
        status: true,
        views_count: true,
        clicks_count: true,
      },
    });

    const jobIds = jobs.map((j: any) => j.id);

    // Get aggregated analytics by source
    const analytics = await this.prisma.jobAnalytics.groupBy({
      by: ['event_type', 'source'],
      where: {
        job_id: { in: jobIds },
        ...(filters?.startDate || filters?.endDate ? { created_at: dateFilter } : {}),
      },
      _count: { id: true },
    });

    // Get total applications
    const totalApplications = await this.prisma.application.count({
      where: {
        job_id: { in: jobIds },
        ...(filters?.startDate || filters?.endDate ? { created_at: dateFilter } : {}),
      },
    });

    // Aggregate stats
    const sources = ['HRM8_BOARD', 'CAREER_PAGE', 'EXTERNAL', 'CANDIDATE_PORTAL'];
    const overview = {
      totalJobs: jobs.length,
      openJobs: jobs.filter((j: any) => j.status === 'OPEN').length,
      totalViews: jobs.reduce((sum: any, j: any) => sum + (j.views_count || 0), 0),
      totalClicks: jobs.reduce((sum: any, j: any) => sum + (j.clicks_count || 0), 0),
      totalApplications,
      viewToClickRate: 0,
      clickToApplyRate: 0,
      viewsBySource: {} as Record<string, number>,
      clicksBySource: {} as Record<string, number>,
    };

    // Initialize sources
    sources.forEach(source => {
      overview.viewsBySource[source] = 0;
      overview.clicksBySource[source] = 0;
    });

    // Fill from analytics
    analytics.forEach((row: any) => {
      const source = row.source || 'HRM8_BOARD';
      if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
        overview.viewsBySource[source] = (overview.viewsBySource[source] || 0) + row._count.id;
      } else if (row.event_type === 'APPLY_CLICK') {
        overview.clicksBySource[source] = (overview.clicksBySource[source] || 0) + row._count.id;
      }
    });

    // Calculate conversion rates
    if (overview.totalViews > 0) {
      overview.viewToClickRate = Math.round((overview.totalClicks / overview.totalViews) * 100 * 10) / 10;
    }
    if (overview.totalClicks > 0) {
      overview.clickToApplyRate = Math.round((overview.totalApplications / overview.totalClicks) * 100 * 10) / 10;
    }

    // Top performing jobs
    const topJobs = jobs
      .filter((j: any) => j.status === 'OPEN')
      .map((j: any) => ({
        id: j.id,
        title: j.title,
        views: j.views_count || 0,
        clicks: j.clicks_count || 0,
      }))
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 5);

    return {
      overview,
      topJobs,
    };
  }
}

export const analyticsService = new AnalyticsService();
