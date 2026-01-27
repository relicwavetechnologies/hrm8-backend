import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AnalyticsService } from './analytics.service';
import { AuthenticatedRequest } from '../../types';

export class AnalyticsController extends BaseController {
  private analyticsService: AnalyticsService;

  constructor() {
    super();
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Get analytics breakdown for a specific job
   * GET /api/analytics/jobs/:jobId/breakdown
   */
  getJobAnalyticsBreakdown = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { jobId } = req.params as { jobId: string };
      const { startDate, endDate } = req.query;

      const data = await this.analyticsService.getJobAnalyticsBreakdown(
        jobId,
        req.user.companyId,
        {
          startDate: startDate as string,
          endDate: endDate as string,
        }
      );

      return this.sendSuccess(res, data);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Get daily analytics trends for a specific job
   * GET /api/analytics/jobs/:jobId/trends
   */
  getJobAnalyticsTrends = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { jobId } = req.params as { jobId: string };
      const { days = '30' } = req.query;

      const data = await this.analyticsService.getJobAnalyticsTrends(
        jobId,
        req.user.companyId,
        parseInt(days as string, 10)
      );

      return this.sendSuccess(res, data);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Get company-wide analytics overview
   * GET /api/analytics/company/overview
   */
  getCompanyAnalyticsOverview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { startDate, endDate } = req.query;

      const data = await this.analyticsService.getCompanyAnalyticsOverview(
        req.user.companyId,
        {
          startDate: startDate as string,
          endDate: endDate as string,
        }
      );

      return this.sendSuccess(res, data);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
