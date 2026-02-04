import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RegionalLicenseeService } from './regional-licensee.service';
import { RegionalLicenseeRepository } from './regional-licensee.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { LicenseeStatus } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';

export class RegionalLicenseeController extends BaseController {
    private regionalLicenseeService: RegionalLicenseeService;
    private auditLogService: AuditLogService;

    constructor() {
        super();
        this.regionalLicenseeService = new RegionalLicenseeService(new RegionalLicenseeRepository());
        this.auditLogService = new AuditLogService(new AuditLogRepository());
    }

    private async logAction(req: Hrm8AuthenticatedRequest, entityId: string, action: string, changes?: Record<string, unknown>, description?: string) {
        const actor = req.hrm8User;
        await this.auditLogService.log({
            entityType: 'LICENSEE',
            entityId,
            action,
            performedBy: actor?.id || 'system',
            performedByEmail: actor?.email || 'unknown',
            performedByRole: actor?.role || 'SYSTEM',
            changes,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string | undefined,
            description,
        });
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { status, limit, offset } = req.query;
            const result = await this.regionalLicenseeService.getAll({
                status: status as LicenseeStatus,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionalLicenseeService.getById(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.regionalLicenseeService.create(req.body, req.hrm8User?.id);
            await this.logAction(req, result.licensee.id, 'CREATE', req.body, 'Licensee created');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionalLicenseeService.update(id as string, req.body);
            await this.logAction(req, id as string, 'UPDATE', req.body, 'Licensee updated');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.regionalLicenseeService.delete(id as string);
            await this.logAction(req, id as string, 'DELETE', undefined, 'Licensee deleted');
            return this.sendSuccess(res, { message: 'Licensee deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStats = async (_req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.regionalLicenseeService.getStats();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateStatus = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const result = await this.regionalLicenseeService.updateStatus(id as string, status as LicenseeStatus);
            await this.logAction(req, id as string, 'STATUS_UPDATE', { status }, 'Licensee status updated');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    terminate = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionalLicenseeService.terminate(id as string);
            await this.logAction(req, id as string, 'TERMINATE', undefined, 'Licensee terminated');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getImpactPreview = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionalLicenseeService.getImpactPreview(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
