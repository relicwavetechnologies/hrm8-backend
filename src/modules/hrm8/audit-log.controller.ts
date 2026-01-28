import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuditLogService } from './audit-log.service';
import { AuthenticatedRequest } from '../../types';

export class AuditLogController extends BaseController {
    private service: AuditLogService;

    constructor() {
        super();
        this.service = new AuditLogService();
    }

    // GET /api/hrm8/audit-logs
    getAll = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { page, limit, entityType, entityId, performedBy, startDate, endDate } = req.query;

            const result = await this.service.getAuditLogs({
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                entityType: entityType as string,
                entityId: entityId as string,
                performedBy: performedBy as string,
                startDate: startDate as string,
                endDate: endDate as string,
            });

            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // GET /api/hrm8/audit-logs/stats
    getStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const stats = await this.service.getAuditLogStats();
            return this.sendSuccess(res, stats);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // GET /api/hrm8/audit-logs/:entityType/:entityId
    getByEntity = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { entityType, entityId } = req.params as { entityType: string; entityId: string };
            const logs = await this.service.getEntityAuditLogs(entityType, entityId);
            return this.sendSuccess(res, { logs });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
