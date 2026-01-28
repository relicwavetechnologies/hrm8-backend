import { BaseService } from '../../core/service';
import { TransactionRepository } from './transaction.repository';
import { HttpException } from '../../core/http-exception';
import { TransactionResponse } from './transaction.types';

export class TransactionService extends BaseService {
    constructor(private repository: TransactionRepository) {
        super();
    }

    /**
     * Get transactions for a company
     */
    async getCompanyTransactions(companyId: string, query: { limit?: number; offset?: number } = {}) {
        const account = await this.repository.findCompanyVirtualAccount(companyId);

        if (!account) {
            // If no account exists, return empty list (or could create one implicitly)
            return [];
        }

        const transactions = await this.repository.findTransactions(account.id, query.limit, query.offset);

        return transactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            balanceAfter: tx.balance_after,
            direction: tx.direction,
            description: tx.description,
            status: tx.status,
            createdAt: tx.created_at,
            referenceType: tx.reference_type,
            referenceId: tx.reference_id,
            metadata: tx.metadata
        }));
    }

    /**
     * Get transaction stats
     */
    async getCompanyTransactionStats(companyId: string) {
        const account = await this.repository.findCompanyVirtualAccount(companyId);

        if (!account) {
            return {
                totalCredits: 0,
                totalDebits: 0,
                balance: 0,
                count: 0
            };
        }

        return this.repository.getStats(account.id);
    }
}
