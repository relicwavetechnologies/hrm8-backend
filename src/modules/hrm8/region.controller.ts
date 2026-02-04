import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RegionService } from './region.service';
import { RegionRepository } from './region.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { RegionOwnerType } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';

export class RegionController extends BaseController {
    private regionService: RegionService;
    private auditLogService: AuditLogService;

    constructor() {
        super();
        this.regionService = new RegionService(new RegionRepository());
        this.auditLogService = new AuditLogService(new AuditLogRepository());
    }

    private async logAction(req: Hrm8AuthenticatedRequest, entityId: string, action: string, changes?: Record<string, unknown>, description?: string) {
        const actor = req.hrm8User;
        await this.auditLogService.log({
            entityType: 'REGION',
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
            const { ownerType, licenseeId, country } = req.query;
            const isGlobalAdmin = req.hrm8User?.role === 'GLOBAL_ADMIN';
            const effectiveLicenseeId = !isGlobalAdmin ? req.hrm8User?.licenseeId : (licenseeId as string);
            const result = await this.regionService.getAll({
                ownerType: ownerType as RegionOwnerType,
                licenseeId: effectiveLicenseeId as string,
                country: country as string,
                regionIds: isGlobalAdmin ? req.assignedRegionIds : undefined,
            });
            return this.sendSuccess(res, { regions: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionService.getById(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.regionService.create(req.body);
            await this.logAction(req, result.id, 'CREATE', req.body, 'Region created');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionService.update(id as string, req.body);
            await this.logAction(req, id as string, 'UPDATE', req.body, 'Region updated');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.regionService.delete(id as string);
            await this.logAction(req, id as string, 'DELETE', undefined, 'Region deleted');
            return this.sendSuccess(res, { message: 'Region deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const { licenseeId } = req.body;
            const result = await this.regionService.assignLicensee(regionId as string, licenseeId as string);
            await this.logAction(req, regionId as string, 'ASSIGN_LICENSEE', { licenseeId }, 'Licensee assigned to region');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    unassignLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const result = await this.regionService.unassignLicensee(regionId as string);
            await this.logAction(req, regionId as string, 'UNASSIGN_LICENSEE', undefined, 'Licensee unassigned from region');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getTransferImpact = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const result = await this.regionService.getTransferImpact(regionId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    transferOwnership = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const { targetLicenseeId, auditNote } = req.body;
            const result = await this.regionService.transferOwnership(regionId as string, targetLicenseeId as string);
            await this.logAction(
                req,
                regionId as string,
                'TRANSFER_OWNERSHIP',
                { targetLicenseeId, auditNote },
                'Region ownership transferred'
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
