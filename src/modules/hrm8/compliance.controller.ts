import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ComplianceService } from './compliance.service';
import { Hrm8AuthenticatedRequest } from '../../types';

export class ComplianceController extends BaseController {
    private service: ComplianceService;

    constructor() {
        super('hrm8-compliance');
        this.service = new ComplianceService();
    }

    getAlerts = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getAlerts();
            return this.sendSuccess(res, { alerts: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getSummary = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getSummary();
            return this.sendSuccess(res, { summary: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
