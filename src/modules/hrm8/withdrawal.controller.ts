import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { WithdrawalService } from './withdrawal.service';
import { Hrm8AuthenticatedRequest } from '../../types';

export class WithdrawalController extends BaseController {
    private withdrawalService: WithdrawalService;

    constructor() {
        super();
        this.withdrawalService = new WithdrawalService();
    }

    private getScopedRegionIds(req: Hrm8AuthenticatedRequest): string[] | undefined {
        if (req.hrm8User?.role !== 'REGIONAL_LICENSEE') {
            return undefined;
        }

        return req.assignedRegionIds || [];
    }

    getPendingWithdrawals = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.withdrawalService.getPendingWithdrawals(this.getScopedRegionIds(req));
            return this.sendSuccess(res, { withdrawals: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    approve = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.withdrawalService.approveWithdrawal(
                id as string,
                this.getScopedRegionIds(req),
                req.hrm8User?.id
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reject = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
            const result = await this.withdrawalService.rejectWithdrawal(
                id as string,
                this.getScopedRegionIds(req),
                req.hrm8User?.id,
                reason
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    processPayment = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const result = await this.withdrawalService.processPayment(
                id as string,
                notes,
                this.getScopedRegionIds(req),
                req.hrm8User?.id
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
