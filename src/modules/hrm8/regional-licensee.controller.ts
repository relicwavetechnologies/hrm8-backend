import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RegionalLicenseeService } from './regional-licensee.service';
import { RegionalLicenseeRepository } from './regional-licensee.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { LicenseeStatus } from '@prisma/client';

export class RegionalLicenseeController extends BaseController {
    private regionalLicenseeService: RegionalLicenseeService;

    constructor() {
        super();
        this.regionalLicenseeService = new RegionalLicenseeService(new RegionalLicenseeRepository());
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
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.regionalLicenseeService.update(id as string, req.body);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.regionalLicenseeService.delete(id as string);
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
