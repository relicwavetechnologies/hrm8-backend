
import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CareersRequestService } from './careers-request.service';
import { CareersRequestRepository } from './careers-request.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class CareersRequestController extends BaseController {
    private careersRequestService: CareersRequestService;

    constructor() {
        super();
        this.careersRequestService = new CareersRequestService(new CareersRequestRepository());
    }

    getRequests = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.careersRequestService.getRequests();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    approve = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { section } = req.body;
            const result = await this.careersRequestService.approve(id as string, section);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reject = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const result = await this.careersRequestService.reject(id as string, reason);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
