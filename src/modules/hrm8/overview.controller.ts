import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { Hrm8AuthenticatedRequest } from '../../types';
import { OverviewRepository } from './overview.repository';
import { OverviewService } from './overview.service';

export class OverviewController extends BaseController {
    private overviewService: OverviewService;

    constructor() {
        super();
        this.overviewService = new OverviewService(new OverviewRepository());
    }

    getOverview = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const role = req.hrm8User?.role || '';
            const regionId = (req.query.regionId as string) || 'all';
            const period = req.query.period as string | undefined;
            const summaryOnly = req.query.summaryOnly === '1' || req.query.summaryOnly === 'true';

            const data = await this.overviewService.getOverview({
                role,
                requestedRegionId: regionId,
                assignedRegionIds: req.assignedRegionIds,
                period,
                summaryOnly
            });

            return this.sendSuccess(res, data);
        } catch (error: any) {
            const status = typeof error?.statusCode === 'number' ? error.statusCode : 400;
            return this.sendError(res, error, status);
        }
    };
}
