import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class SettingsController extends BaseController {
    private settingsService: SettingsService;

    constructor() {
        super();
        this.settingsService = new SettingsService(new SettingsRepository());
    }

    getSettings = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { group } = req.query;
            const result = await this.settingsService.getSettings(group as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateSetting = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { key, value } = req.body;
            // Use key from params if available, otherwise from body
            const settingKey = req.params.key || key;
            const result = await this.settingsService.updateSetting(
                settingKey,
                value,
                req.hrm8User?.id || 'system'
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
