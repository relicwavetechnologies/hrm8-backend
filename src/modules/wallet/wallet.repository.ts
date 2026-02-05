import { BaseRepository } from '../../core/repository';
import {
    VirtualAccountOwner,
    VirtualTransactionType,
    Prisma
} from '@prisma/client';
import { CreditAccountInput, DebitAccountInput, TransactionHistoryOptions } from './wallet.types';

export class WalletRepository extends BaseRepository {

    async findAccountByOwner(ownerType: VirtualAccountOwner, ownerId: string) {
        return this.prisma.virtualAccount.findUnique({
            where: {
                owner_type_owner_id: {
                    owner_type: ownerType,
                    owner_id: ownerId
                }
            }
        });
    }

    async findAccountById(id: string) {
        return this.prisma.virtualAccount.findUnique({
            where: { id }
        });
    }

    async createAccount(data: Prisma.VirtualAccountCreateInput) {
        return this.prisma.virtualAccount.create({ data });
    }

    async findTransactionsByAccountId(accountId: string, options: TransactionHistoryOptions) {
        const { limit = 50, offset = 0 } = options;
        return this.prisma.virtualTransaction.findMany({
            where: { virtual_account_id: accountId },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset
        });
    }

    async countTransactionsByAccountId(accountId: string) {
        return this.prisma.virtualTransaction.count({
            where: { virtual_account_id: accountId }
        });
    }

    async findTransactionById(id: string) {
        return this.prisma.virtualTransaction.findUnique({
            where: { id }
        });
    }

    async executeCredit(params: CreditAccountInput, newBalance: number) {
        return this.prisma.$transaction(async (tx) => {
            const transactionData: Prisma.VirtualTransactionUncheckedCreateInput = {
                virtual_account_id: params.accountId!,
                type: params.type,
                amount: params.amount,
                balance_after: newBalance,
                direction: 'CREDIT',
                status: 'COMPLETED',
                description: params.description,
                reference_id: params.referenceId,
                reference_type: params.referenceType,
                created_by: params.createdBy
            };

            const transaction = await tx.virtualTransaction.create({
                data: transactionData
            });

            await tx.virtualAccount.update({
                where: { id: params.accountId! },
                data: {
                    balance: newBalance,
                    total_credits: { increment: params.amount }
                }
            });

            return transaction;
        });
    }

    async executeDebit(params: DebitAccountInput, newBalance: number) {
        return this.prisma.$transaction(async (tx) => {
            const transactionData: Prisma.VirtualTransactionUncheckedCreateInput = {
                virtual_account_id: params.accountId!,
                type: params.type,
                amount: params.amount,
                balance_after: newBalance,
                direction: 'DEBIT',
                status: 'COMPLETED',
                description: params.description,
                reference_id: params.referenceId,
                reference_type: params.referenceType,
                created_by: params.createdBy
            };

            const transaction = await tx.virtualTransaction.create({
                data: transactionData
            });

            await tx.virtualAccount.update({
                where: { id: params.accountId! },
                data: {
                    balance: newBalance,
                    total_debits: { increment: params.amount }
                }
            });

            return transaction;
        });
    }
}
