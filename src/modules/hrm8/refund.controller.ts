import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RefundService } from './refund.service';
import { RefundRepository } from './refund.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { RefundStatus } from '@prisma/client';

export class RefundController extends BaseController {
    private refundService: RefundService;

    constructor() {
        super();
        this.refundService = new RefundService(new RefundRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { status, companyId } = req.query;
            const result = await this.refundService.getAll({
                status: status as RefundStatus,
                companyId: companyId as string,
            });
            return this.sendSuccess(res, { refundRequests: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    approve = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { adminNotes } = req.body;
            const result = await this.refundService.approve(
                id as string,
                req.hrm8User?.id || 'unknown',
                adminNotes
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reject = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { rejectionReason } = req.body;
            const result = await this.refundService.reject(
                id as string,
                req.hrm8User?.id || 'unknown',
                rejectionReason
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    complete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { paymentReference } = req.body;
            const result = await this.refundService.complete(
                id as string,
                paymentReference
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
