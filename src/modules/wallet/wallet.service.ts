import { prisma } from '../../utils/prisma';
import { 
  VirtualAccountOwner, 
  VirtualAccountStatus, 
  VirtualTransactionType, 
  TransactionDirection, 
  TransactionStatus 
} from '@prisma/client';

export class WalletService {
  /**
   * Get or create a wallet account for an owner
   */
  static async getOrCreateAccount(ownerType: VirtualAccountOwner, ownerId: string) {
    let account = await prisma.virtualAccount.findUnique({
      where: {
        owner_type_owner_id: {
          owner_type: ownerType,
          owner_id: ownerId
        }
      }
    });

    if (!account) {
      account = await prisma.virtualAccount.create({
        data: {
          owner_type: ownerType,
          owner_id: ownerId,
          balance: 0,
          status: 'ACTIVE'
        }
      });
    }

    return account;
  }

  /**
   * Get wallet balance
   */
  static async getBalance(ownerType: VirtualAccountOwner, ownerId: string) {
    const account = await this.getOrCreateAccount(ownerType, ownerId);
    return {
      balance: account.balance,
      totalCredits: account.total_credits || 0,
      totalDebits: account.total_debits || 0,
      currency: 'USD', // Assuming USD for now
      status: account.status
    };
  }

  /**
   * Get transaction history
   */
  static async getTransactions(ownerType: VirtualAccountOwner, ownerId: string, options: { limit?: number; offset?: number } = {}) {
    const account = await this.getOrCreateAccount(ownerType, ownerId);
    
    const transactions = await prisma.virtualTransaction.findMany({
      where: { virtual_account_id: account.id },
      orderBy: { created_at: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    });

    const total = await prisma.virtualTransaction.count({
      where: { virtual_account_id: account.id }
    });

    return {
      transactions,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0
    };
  }

  /**
   * Credit account (Deposit/Earnings)
   */
  static async creditAccount(params: {
    accountId: string;
    amount: number;
    type: VirtualTransactionType;
    description?: string;
    referenceId?: string;
    referenceType?: string;
    createdBy?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.virtualAccount.findUnique({ where: { id: params.accountId } });
      if (!account) throw new Error('Account not found');

      const newBalance = account.balance + params.amount;

      const transaction = await tx.virtualTransaction.create({
        data: {
          virtual_account_id: account.id,
          type: params.type,
          amount: params.amount,
          balance_after: newBalance,
          direction: 'CREDIT',
          status: 'COMPLETED',
          description: params.description,
          reference_id: params.referenceId,
          reference_type: params.referenceType,
          created_by: params.createdBy
        }
      });

      await tx.virtualAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance,
          total_credits: { increment: params.amount }
        }
      });

      return transaction;
    });
  }

  /**
   * Debit account (Payment/Withdrawal)
   */
  static async debitAccount(params: {
    accountId: string;
    amount: number;
    type: VirtualTransactionType;
    description?: string;
    referenceId?: string;
    referenceType?: string;
    createdBy?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.virtualAccount.findUnique({ where: { id: params.accountId } });
      if (!account) throw new Error('Account not found');

      if (account.balance < params.amount) {
        throw new Error('Insufficient balance');
      }

      const newBalance = account.balance - params.amount;

      const transaction = await tx.virtualTransaction.create({
        data: {
          virtual_account_id: account.id,
          type: params.type,
          amount: params.amount,
          balance_after: newBalance,
          direction: 'DEBIT',
          status: 'COMPLETED',
          description: params.description,
          reference_id: params.referenceId,
          reference_type: params.referenceType,
          created_by: params.createdBy
        }
      });

      await tx.virtualAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance,
          total_debits: { increment: params.amount }
        }
      });

      return transaction;
    });
  }
}
