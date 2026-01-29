import { BaseRepository } from '../../core/repository';
import { TransactionResponse, TransactionStats } from './transaction.types';

export class TransactionRepository extends BaseRepository {
    /**
     * Find company's virtual account
     */
    async findCompanyVirtualAccount(companyId: string) {
        return this.prisma.virtualAccount.findFirst({
            where: {
                owner_type: 'COMPANY',
                owner_id: companyId
            }
        });
    }

    /**
     * Find transactions for an account
     */
    async findTransactions(accountId: string, limit = 50, offset = 0) {
        return this.prisma.virtualTransaction.findMany({
            where: {
                virtual_account_id: accountId
            },
            orderBy: {
                created_at: 'desc'
            },
            take: limit,
            skip: offset
        });
    }

    /**
     * Get transaction stats from account
     */
    async getStats(accountId: string): Promise<TransactionStats> {
        const account = await this.prisma.virtualAccount.findUnique({
            where: { id: accountId }
        });

        if (!account) {
            return {
                totalCredits: 0,
                totalDebits: 0,
                balance: 0,
                count: 0
            };
        }

        const count = await this.prisma.virtualTransaction.count({
            where: { virtual_account_id: accountId }
        });

        return {
            totalCredits: account.total_credits,
            totalDebits: account.total_debits,
            balance: account.balance,
            count
        };
    }
}
