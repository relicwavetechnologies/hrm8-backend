import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest } from '../../types';
import { SignupRequestService } from './signup-request.service';
import { SignupRequestRepository } from './signup-request.repository';
import { AuthRepository } from './auth.repository';

export class SignupRequestController extends BaseController {
    private signupRequestService: SignupRequestService;

    constructor() {
        super();
        this.signupRequestService = new SignupRequestService(
            new SignupRequestRepository(),
            new AuthRepository()
        );
    }

    getPending = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.user!.companyId;
            const requests = await this.signupRequestService.getPendingRequests(companyId);
            return this.sendSuccess(res, requests);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getAll = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.user!.companyId;
            const requests = await this.signupRequestService.getAllRequests(companyId);
            return this.sendSuccess(res, requests);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    approve = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const reviewerId = req.user!.id;
            const result = await this.signupRequestService.approveRequest(id, reviewerId);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reject = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const reviewerId = req.user!.id;
            const result = await this.signupRequestService.rejectRequest(id, reviewerId, reason);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
