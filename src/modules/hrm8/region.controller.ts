import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RegionService } from './region.service';
import { RegionRepository } from './region.repository';
import { LicenseeService } from './licensee.service';
import { LicenseeRepository } from './licensee.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { LicenseeStatus } from '@prisma/client';

export class RegionController extends BaseController {
    private service: RegionService;
    private licenseeService: LicenseeService;

    constructor() {
        super('hrm8-region');
        this.service = new RegionService(new RegionRepository());
        this.licenseeService = new LicenseeService(new LicenseeRepository());
    }

    // --- Regions ---
    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getAllRegions();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.createRegion(req.body);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getRegion(req.params.id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.updateRegion(req.params.id as string, req.body);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.deleteRegion(req.params.id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    assignLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.assignLicensee(req.params.id as string, req.body.licenseeId);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    unassignLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.unassignLicensee(req.params.id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Licensees ---
    getAllLicensees = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const status = req.query.status as string;
            const result = await this.licenseeService.getAllLicensees({ status: status as LicenseeStatus });
            return this.sendSuccess(res, { licensees: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.licenseeService.getLicensee(req.params.id as string);
            return this.sendSuccess(res, { licensee: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    createLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.licenseeService.createLicensee(req.body);
            return this.sendSuccess(res, { licensee: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    updateLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.licenseeService.updateLicensee(req.params.id as string, req.body);
            return this.sendSuccess(res, { licensee: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    suspendLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.licenseeService.suspendLicensee(req.params.id as string);
            return this.sendSuccess(res, { licensee: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    terminateLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.licenseeService.terminateLicensee(req.params.id as string);
            return this.sendSuccess(res, { licensee: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    deleteLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            await this.licenseeService.deleteLicensee(req.params.id as string);
            return this.sendSuccess(res, null, 'Licensee deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
