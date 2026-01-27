import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CompanySettingsService } from './company-settings.service';
import { CompanySettingsRepository } from './company-settings.repository';
import { AuthenticatedRequest } from '../../types';

export class CompanySettingsController extends BaseController {
    private service: CompanySettingsService;

    constructor() {
        super('company-settings');
        this.service = new CompanySettingsService(new CompanySettingsRepository());
    }

    /**
     * Get Settings
     */
    getSettings = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('User not authenticated'));
            }
            const settings = await this.service.getSettings(req.user.companyId);
            return this.sendSuccess(res, settings);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Update Settings
     */
    updateSettings = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('User not authenticated'));
            }
            const settings = await this.service.updateSettings(req.user.companyId, req.body);
            return this.sendSuccess(res, settings, 'Settings updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
