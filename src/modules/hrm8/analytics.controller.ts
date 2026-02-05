import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class AnalyticsController extends BaseController {
    private analyticsService: AnalyticsService;

    constructor() {
        super();
        this.analyticsService = new AnalyticsService(new AnalyticsRepository());
    }

    getOperationalStats = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const result = await this.analyticsService.getOperationalStats(regionId as string, req.assignedRegionIds);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getRegionalCompanies = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const { status } = req.query;
            const result = await this.analyticsService.getRegionalCompanies(
                regionId as string,
                status as string,
                req.assignedRegionIds
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getPlatformOverview = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { startDate, endDate, companyId, regionId, start_date, end_date, company_id, region_id } = req.query as Record<string, string | undefined>;
            const result = await this.analyticsService.getPlatformOverview({
                startDate: (start_date || startDate) as string,
                endDate: (end_date || endDate) as string,
                companyId: (company_id || companyId) as string,
                regionId: (region_id || regionId) as string,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getPlatformTrends = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { period, companyId, regionId, company_id, region_id } = req.query as Record<string, string | undefined>;
            const result = await this.analyticsService.getPlatformTrends(
                period as string,
                {
                    companyId: (company_id || companyId) as string,
                    regionId: (region_id || regionId) as string,
                }
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getTopCompanies = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { limit, regionId } = req.query;
            const result = await this.analyticsService.getTopPerformingCompanies(
                limit ? parseInt(limit as string, 10) : 10,
                regionId as string
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getJobBoardStats = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.analyticsService.getJobBoardStats();
            return this.sendSuccess(res, { companies: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
