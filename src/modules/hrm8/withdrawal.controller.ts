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

    getPendingWithdrawals = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.withdrawalService.getPendingWithdrawals();
            return this.sendSuccess(res, { withdrawals: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    approve = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.withdrawalService.approveWithdrawal(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reject = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.withdrawalService.rejectWithdrawal(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    processPayment = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const result = await this.withdrawalService.processPayment(id as string, notes);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
