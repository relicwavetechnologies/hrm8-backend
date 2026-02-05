import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class AuditLogController extends BaseController {
    private auditLogService: AuditLogService;

    constructor() {
        super();
        this.auditLogService = new AuditLogService(new AuditLogRepository());
    }

    getRecent = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const entityType = (req.query.entity_type ?? req.query.entityType) as string | undefined;
            const action = (req.query.action ?? req.query.action) as string | undefined;
            const actorId = (req.query.actor_id ?? req.query.actorId) as string | undefined;
            const limitParam = (req.query.limit ?? req.query.limit) as string | undefined;
            const offsetParam = (req.query.offset ?? req.query.offset) as string | undefined;

            const result = await this.auditLogService.getRecent({
                entityType,
                action,
                actorId,
                limit: limitParam ? parseInt(limitParam, 10) : 50,
                offset: offsetParam ? parseInt(offsetParam, 10) : 0,
            });

            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getByEntity = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { entityType, entityId } = req.params;
            const { limit } = req.query;

            const logs = await this.auditLogService.getByEntity(
                entityType as string,
                entityId as string,
                limit ? parseInt(limit as string, 10) : 50
            );

            return this.sendSuccess(res, { logs });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStats = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const stats = await this.auditLogService.getStats();
            return this.sendSuccess(res, stats);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
