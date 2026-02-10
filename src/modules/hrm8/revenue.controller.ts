import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RevenueService } from './revenue.service';
import { RevenueRepository } from './revenue.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { RevenueStatus } from '@prisma/client';

export class RevenueController extends BaseController {
    private revenueService: RevenueService;

    constructor() {
        super();
        this.revenueService = new RevenueService(new RevenueRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const regionId = (req.query.regionId || req.query.region_id) as string;
            const licenseeId = (req.query.licenseeId || req.query.licensee_id) as string;
            const status = req.query.status as RevenueStatus;
            const result = await this.revenueService.getAll({
                regionId,
                licenseeId,
                status,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.revenueService.getById(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    confirm = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.revenueService.confirm(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    markAsPaid = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.revenueService.markAsPaid(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getCompanyBreakdown = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.revenueService.getCompanyBreakdown(req.assignedRegionIds);
            return this.sendSuccess(res, { companies: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getDashboard = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const startDate = (req.query.startDate || req.query.start_date) as string;
            const endDate = (req.query.endDate || req.query.end_date) as string;
            const result = await this.revenueService.getDashboard(
                req.assignedRegionIds,
                startDate,
                endDate
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getSummary = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const startDate = (req.query.startDate || req.query.start_date) as string;
            const endDate = (req.query.endDate || req.query.end_date) as string;
            const result = await this.revenueService.getSummary(
                req.assignedRegionIds,
                startDate,
                endDate
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
