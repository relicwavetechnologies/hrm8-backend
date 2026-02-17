import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CommissionService } from './commission.service';
import { CommissionRepository } from './commission.repository';
import { AuthenticatedRequest } from '../../types';

export class CommissionController extends BaseController {
    private commissionService: CommissionService;

    constructor() {
        super();
        this.commissionService = new CommissionService(new CommissionRepository());
    }

    getAll = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { limit, offset, consultantId } = req.query;
            const result = await this.commissionService.getAll({
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
                consultantId: consultantId as string,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.commissionService.getById(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.commissionService.create(req.body);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    confirm = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.commissionService.confirm(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    markAsPaid = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.commissionService.markAsPaid(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    processPayments = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { ids } = req.body;
            await this.commissionService.processPayments(ids);
            return this.sendSuccess(res, { message: 'Payments processed successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getRegional = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // We might need to get region from user or query
            const { regionId } = req.query;
            const result = await this.commissionService.getRegional(regionId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    dispute = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const result = await this.commissionService.dispute(id, reason);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    resolveDispute = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { resolution, notes } = req.body;
            const result = await this.commissionService.resolveDispute(id, resolution, notes);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    clawback = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const result = await this.commissionService.clawback(id, reason);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
