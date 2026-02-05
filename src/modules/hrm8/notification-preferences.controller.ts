import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesRepository } from './notification-preferences.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class NotificationPreferencesController extends BaseController {
    private service: NotificationPreferencesService;

    constructor() {
        super('hrm8-notification-preferences');
        this.service = new NotificationPreferencesService(new NotificationPreferencesRepository());
    }

    getPreferences = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.hrm8User?.id;
            if (!userId) throw new Error('User not found');
            const result = await this.service.getPreferences(userId);
            return this.sendSuccess(res, { preferences: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    updatePreferences = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.hrm8User?.id;
            if (!userId) throw new Error('User not found');
            const result = await this.service.updatePreferences(userId, req.body);
            return this.sendSuccess(res, { preferences: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getAlertRules = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.hrm8User?.id;
            if (!userId) throw new Error('User not found');
            const result = await this.service.getAlertRules(userId);
            return this.sendSuccess(res, { rules: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    createAlertRule = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.hrm8User?.id;
            if (!userId) throw new Error('User not found');
            const result = await this.service.createAlertRule(userId, req.body);
            return this.sendSuccess(res, { rule: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    updateAlertRule = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.hrm8User?.id;
            if (!userId) throw new Error('User not found');
            const result = await this.service.updateAlertRule(req.params.id as string, userId, req.body);
            return this.sendSuccess(res, { rule: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    deleteAlertRule = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.hrm8User?.id;
            if (!userId) throw new Error('User not found');
            await this.service.deleteAlertRule(req.params.id as string, userId);
            return this.sendSuccess(res, { message: 'Rule deleted' });
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
