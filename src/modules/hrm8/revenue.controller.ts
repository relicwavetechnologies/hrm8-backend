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
            const { regionId, licenseeId, status, region_id, licensee_id } = req.query as Record<string, string | undefined>;
            const result = await this.revenueService.getAll({
                regionId: regionId || region_id,
                licenseeId: licenseeId || licensee_id,
                status: status as RevenueStatus,
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
            const { startDate, endDate, start_date, end_date } = req.query as Record<string, string | undefined>;
            const result = await this.revenueService.getDashboard(
                req.assignedRegionIds,
                (startDate || start_date) as string,
                (endDate || end_date) as string
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getSummary = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { startDate, endDate, start_date, end_date } = req.query as Record<string, string | undefined>;
            const result = await this.revenueService.getSummary(
                req.assignedRegionIds,
                (startDate || start_date) as string,
                (endDate || end_date) as string
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
