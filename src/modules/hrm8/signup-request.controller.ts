import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { SignupRequestService } from './signup-request.service';
import { SignupRequestRepository } from './signup-request.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { SignupRequestStatus } from '@prisma/client';

export class SignupRequestController extends BaseController {
    private service: SignupRequestService;

    constructor() {
        super('hrm8-signup-requests');
        this.service = new SignupRequestService(new SignupRequestRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const status = req.query.status as SignupRequestStatus;
            const result = await this.service.getRequests(status);
            return this.sendSuccess(res, { requests: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getPending = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getRequests('PENDING');
            return this.sendSuccess(res, { requests: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getRequestById(req.params.id as string);
            return this.sendSuccess(res, { request: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    approve = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const hrm8User = req.hrm8User;
            if (!hrm8User) return this.sendError(res, new Error('HRM8 User not found'), 401);

            const result = await this.service.approveRequest(
                req.params.id as string,
                hrm8User.id,
                req.body.adminNotes
            );
            return this.sendSuccess(res, { request: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    reject = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const hrm8User = req.hrm8User;
            if (!hrm8User) return this.sendError(res, new Error('HRM8 User not found'), 401);

            const result = await this.service.rejectRequest(
                req.params.id as string,
                hrm8User.id,
                req.body.adminNotes // or reason
            );
            return this.sendSuccess(res, { request: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
