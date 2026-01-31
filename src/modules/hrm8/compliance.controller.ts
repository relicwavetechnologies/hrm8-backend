import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ComplianceService } from './compliance.service';
import { ComplianceRepository } from './compliance.repository';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { AuthenticatedRequest } from '../../types';

export class ComplianceController extends BaseController {
    private complianceService: ComplianceService;

    constructor() {
        super();
        this.complianceService = new ComplianceService(
            new ComplianceRepository(),
            new AuditLogService(new AuditLogRepository())
        );
    }

    getAlerts = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.complianceService.getAllAlerts();
            return this.sendSuccess(res, { alerts: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getAlertSummary = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.complianceService.getAlertSummary();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getAuditHistory = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { entityType, entityId } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;
            const entityTypeStr = (entityType as string).toUpperCase();

            const validEntityTypes = ['LICENSEE', 'REGION', 'CONSULTANT', 'SETTLEMENT', 'JOB'];
            if (!validEntityTypes.includes(entityTypeStr)) {
                return this.sendError(res, new Error(`Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`), 400);
            }

            const history = await this.complianceService.getAuditHistory(entityTypeStr, entityId as string, limit);
            return this.sendSuccess(res, { history });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getRecentAudit = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 100;
            const entries = await this.complianceService.getRecentAudit(limit);
            // Service returns { logs, total } so adjust response if needed
            // Correcting expectation: AuditLogService.getRecent returns { logs, total }
            // Old controller returned { data: { entries } } where entries was likely array.
            // Let's stick to standard { success: true, data: { entries } } wrapper via sendSuccess
            return this.sendSuccess(res, { entries });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
