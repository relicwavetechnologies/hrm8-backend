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
            const {
                limit,
                offset,
                consultantId,
                regionId,
                jobId,
                companyId,
                status,
                commissionType,
                consultant_id,
                region_id,
                job_id,
                company_id,
                commission_type,
            } = req.query as Record<string, string | undefined>;
            const result = await this.commissionService.getAll({
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
                consultantId: consultantId || consultant_id,
                regionId: regionId || region_id,
                jobId: jobId || job_id,
                companyId: companyId || company_id,
                status: status as string,
                commissionType: commissionType || commission_type,
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
            const body = req.body || {};
            const result = await this.commissionService.create({
                consultantId: body.consultantId || body.consultant_id,
                jobId: body.jobId || body.job_id,
                subscriptionId: body.subscriptionId || body.subscription_id,
                type: body.commissionType || body.commission_type || body.type,
                amount: body.amount,
                rate: body.rate,
                description: body.description,
            });
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
            const { paymentReference, payment_reference } = req.body;
            const result = await this.commissionService.markAsPaid(
                id as string,
                (paymentReference || payment_reference) as string | undefined
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    processPayments = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { commissionIds, paymentReference, commission_ids, payment_reference } = req.body;
            await this.commissionService.processPayments(
                commissionIds || commission_ids,
                paymentReference || payment_reference
            );
            return this.sendSuccess(res, { message: 'Payments processed successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getRegional = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // We might need to get region from user or query
            const { regionId, region_id } = req.query as Record<string, string | undefined>;
            const result = await this.commissionService.getRegional((regionId || region_id) as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
