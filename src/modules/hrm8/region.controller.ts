import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RegionService } from './region.service';
import { RegionRepository } from './region.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { RegionOwnerType } from '@prisma/client';

export class RegionController extends BaseController {
    private regionService: RegionService;

    constructor() {
        super();
        this.regionService = new RegionService(new RegionRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { ownerType, licenseeId, country, isActive } = req.query;
            const result = await this.regionService.getAll({
                ownerType: ownerType as RegionOwnerType,
                licenseeId: licenseeId as string,
                country: country as string,
                isActive: isActive as string | undefined,
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, { regions: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionService.getById(id as string, {
                regionIds: req.assignedRegionIds,
                role: req.hrm8User?.role,
            });
            return this.sendSuccess(res, { region: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getOverview = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.regionService.getOverview({
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.regionService.create(req.body, req.hrm8User?.id);
            return this.sendSuccess(res, { region: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionService.update(id as string, req.body, req.hrm8User?.id);
            return this.sendSuccess(res, { region: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionService.delete(id as string, req.hrm8User?.id);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const { licenseeId } = req.body;
            const result = await this.regionService.assignLicensee(regionId as string, licenseeId as string, req.hrm8User?.id);
            return this.sendSuccess(res, { region: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    unassignLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const result = await this.regionService.unassignLicensee(regionId as string, req.hrm8User?.id);
            return this.sendSuccess(res, { region: result });
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
            if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                return this.sendError(res, new Error('Access denied. Required roles: GLOBAL_ADMIN'), 403);
            }
            const { regionId } = req.params;
            const { targetLicenseeId, auditNote } = req.body;
            const result = await this.regionService.transferOwnership(
                regionId as string,
                targetLicenseeId as string,
                auditNote,
                req.hrm8User?.id
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
