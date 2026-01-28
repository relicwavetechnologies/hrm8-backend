import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { TransactionService } from './transaction.service';
import { TransactionRepository } from './transaction.repository';
import { AuthenticatedRequest } from '../../types';

export class TransactionController extends BaseController {
    private service: TransactionService;

    constructor() {
        super('company-transactions');
        this.service = new TransactionService(new TransactionRepository());
    }

    /**
     * Get company transactions
     * GET /api/companies/transactions
     */
    getTransactions = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                console.error('[TransactionController] Unauthorized - No user in request');
                return this.sendError(res, new Error('Unauthorized'), 401);
            }

            console.log('[TransactionController] getTransactions for user:', req.user.email, 'CompanyId:', req.user.companyId);

            if (!req.user.companyId) {
                console.error('[TransactionController] No Company ID for user:', req.user.id);
                return this.sendError(res, new Error('Company not found for user'), 404);
            }

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const transactions = await this.service.getCompanyTransactions(req.user.companyId, { limit, offset });
            return this.sendSuccess(res, { transactions });
        } catch (error) {
            console.error('[TransactionController] Error in getTransactions:', error);
            if (error instanceof Error) {
                console.error(error.stack);
            }
            return this.sendError(res, error);
        }
    };

    /**
     * Get transaction stats
     * GET /api/companies/transactions/stats
     */
    getStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('Unauthorized'), 401);
            }

            const stats = await this.service.getCompanyTransactionStats(req.user.companyId);
            return this.sendSuccess(res, stats);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
