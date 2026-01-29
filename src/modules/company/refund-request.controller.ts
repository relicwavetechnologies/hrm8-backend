import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { RefundRequestService } from './refund-request.service';
import { RefundRequestRepository } from './refund-request.repository';
import { AuthenticatedRequest } from '../../types';

export class RefundRequestController extends BaseController {
    private service: RefundRequestService;

    constructor() {
        super('company-refunds');
        this.service = new RefundRequestService(new RefundRequestRepository());
    }

    /**
     * Create refund request
     * POST /api/companies/refund-requests
     */
    createRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) {
                return this.sendError(res, new Error('Unauthorized'), 401);
            }

            const { transactionId, reason } = req.body;

            if (!transactionId || !reason) {
                return this.sendError(res, new Error('Transaction ID and reason are required'), 400);
            }

            const request = await this.service.createRequest(req.user.companyId as string, { transactionId, reason });
            return this.sendSuccess(res, request);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get refund requests
     * GET /api/companies/refund-requests
     */
    getRequests = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) {
                return this.sendError(res, new Error('Unauthorized'), 401);
            }

            const requests = await this.service.getRequests(req.user.companyId as string);
            return this.sendSuccess(res, requests);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Withdraw request
     * PUT /api/companies/refund-requests/:id/withdraw
     */
    withdrawRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) {
                return this.sendError(res, new Error('Unauthorized'), 401);
            }

            const { id } = req.params as { id: string };
            const result = await this.service.withdrawRequest(id, req.user.companyId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Cancel request (alias for withdraw or hard delete depending on business logic)
     * DELETE /api/companies/refund-requests/:id
     */
    cancelRequest = async (req: AuthenticatedRequest, res: Response) => {
        return this.withdrawRequest(req, res);
    };
}
