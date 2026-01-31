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
            const { ownerType, licenseeId, country } = req.query;
            const result = await this.regionService.getAll({
                ownerType: ownerType as RegionOwnerType,
                licenseeId: licenseeId as string,
                country: country as string,
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, result);
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
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionService.update(id as string, req.body);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.regionService.delete(id as string);
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
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    unassignLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.params;
            const result = await this.regionService.unassignLicensee(regionId as string);
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
            const { targetLicenseeId } = req.body;
            const result = await this.regionService.transferOwnership(regionId as string, targetLicenseeId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
