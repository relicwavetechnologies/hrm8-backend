import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest } from '../../types';
import { JobBoardSettingsService } from './job-board-settings.service';

export class JobBoardSettingsController extends BaseController {
    private service: JobBoardSettingsService;

    constructor() {
        super('job-board-settings');
        this.service = new JobBoardSettingsService();
    }

    getSettings = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'));
            const settings = await this.service.getSettings(req.user.companyId);
            return this.sendSuccess(res, settings);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateSettings = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'));
            const updated = await this.service.updateSettings(req.user.companyId, req.body);
            return this.sendSuccess(res, updated, 'Job board settings updated');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
