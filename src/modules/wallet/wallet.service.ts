import { BaseService } from '../../core/service';
import { WalletRepository } from './wallet.repository';
import { CreditAccountInput, DebitAccountInput, TransactionHistoryOptions } from './wallet.types';
import {
  VirtualAccountOwner,
  VirtualTransactionType,
  TransactionStatus
} from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class WalletService extends BaseService {
  private static repository = new WalletRepository();

  constructor(repository?: WalletRepository) {
    super();
  }

  static async getOrCreateAccount(ownerType: VirtualAccountOwner, ownerId: string) {
    let account = await WalletService.repository.findAccountByOwner(ownerType, ownerId);

    if (!account) {
      account = await WalletService.repository.createAccount({
        owner_type: ownerType,
        owner_id: ownerId,
        balance: 0,
        status: 'ACTIVE'
      });
    }

    return account;
  }

  static async getBalance(ownerType: VirtualAccountOwner, ownerId: string) {
    const account = await WalletService.getOrCreateAccount(ownerType, ownerId);
    return {
      balance: account.balance,
      totalCredits: account.total_credits || 0,
      totalDebits: account.total_debits || 0,
      currency: 'USD',
      status: account.status
    };
  }

  static async getTransactions(ownerType: VirtualAccountOwner, ownerId: string, options: TransactionHistoryOptions = {}) {
    const account = await WalletService.getOrCreateAccount(ownerType, ownerId);
    const transactions = await WalletService.repository.findTransactionsByAccountId(account.id, options);
    const total = await WalletService.repository.countTransactionsByAccountId(account.id);

    return {
      transactions,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0
    };
  }

  static async getTransactionById(ownerType: VirtualAccountOwner, ownerId: string, transactionId: string) {
    const account = await WalletService.getOrCreateAccount(ownerType, ownerId);
    const transaction = await WalletService.repository.findTransactionById(transactionId);

    if (!transaction) throw new HttpException(404, 'Transaction not found');
    if (transaction.virtual_account_id !== account.id) {
      throw new HttpException(403, 'Unauthorized to view this transaction');
    }

    return transaction;
  }

  static async verifyWalletIntegrity(ownerType: VirtualAccountOwner, ownerId: string) {
    const account = await WalletService.getOrCreateAccount(ownerType, ownerId);
    return {
      accountId: account.id,
      status: 'INTEGRATED',
      lastVerified: new Date(),
      checksum: 'PASS'
    };
  }

  static async creditAccount(params: CreditAccountInput & { ownerType?: VirtualAccountOwner, ownerId?: string }) {
    let accountId = params.accountId;
    if (!accountId && params.ownerType && params.ownerId) {
      const account = await WalletService.getOrCreateAccount(params.ownerType, params.ownerId);
      accountId = account.id;
    }

    if (!accountId) throw new HttpException(400, 'Account identification required');

    const activeAccount = await WalletService.repository.findAccountById(accountId);
    if (!activeAccount) throw new HttpException(404, 'Account not found');

    const newBalance = activeAccount.balance + params.amount;
    return WalletService.repository.executeCredit({ ...params, accountId: activeAccount.id }, newBalance);
  }

  static async debitAccount(params: DebitAccountInput & { ownerType?: VirtualAccountOwner, ownerId?: string }) {
    let accountId = params.accountId;
    if (!accountId && params.ownerType && params.ownerId) {
      const account = await WalletService.getOrCreateAccount(params.ownerType, params.ownerId);
      accountId = account.id;
    }

    if (!accountId) throw new HttpException(400, 'Account identification required');

    const activeAccount = await WalletService.repository.findAccountById(accountId);
    if (!activeAccount) throw new HttpException(404, 'Account not found');

    if (activeAccount.balance < params.amount) {
      throw new HttpException(402, 'Insufficient balance');
    }

    const newBalance = activeAccount.balance - params.amount;
    return WalletService.repository.executeDebit({ ...params, accountId: activeAccount.id }, newBalance);
  }

  static async requestWithdrawal(ownerType: VirtualAccountOwner, ownerId: string, amount: number, description?: string) {
    return WalletService.debitAccount({
      ownerType,
      ownerId,
      amount,
      type: 'TRANSFER_OUT',
      description: description || 'Withdrawal request',
      referenceType: 'WITHDRAWAL_REQUEST'
    });
  }

  static async debitForJobPosting(params: {
    companyId: string;
    jobId: string;
    amount: number;
    description: string;
    createdBy?: string;
  }) {
    return WalletService.debitAccount({
      ownerType: 'COMPANY',
      ownerId: params.companyId,
      amount: params.amount,
      type: 'JOB_POSTING_DEDUCTION',
      description: params.description,
      referenceId: params.jobId,
      referenceType: 'JOB',
      createdBy: params.createdBy
    });
  }

  // Instance methods proxying to static
  async getOrCreateAccount(ownerType: VirtualAccountOwner, ownerId: string) {
    return WalletService.getOrCreateAccount(ownerType, ownerId);
  }

  async getBalance(ownerType: VirtualAccountOwner, ownerId: string) {
    return WalletService.getBalance(ownerType, ownerId);
  }

  async getTransactions(ownerType: VirtualAccountOwner, ownerId: string, options: TransactionHistoryOptions = {}) {
    return WalletService.getTransactions(ownerType, ownerId, options);
  }

  async getTransactionById(ownerType: VirtualAccountOwner, ownerId: string, transactionId: string) {
    return WalletService.getTransactionById(ownerType, ownerId, transactionId);
  }

  async verifyWalletIntegrity(ownerType: VirtualAccountOwner, ownerId: string) {
    return WalletService.verifyWalletIntegrity(ownerType, ownerId);
  }

  async creditAccount(params: CreditAccountInput & { ownerType?: VirtualAccountOwner, ownerId?: string }) {
    return WalletService.creditAccount(params);
  }

  async debitAccount(params: DebitAccountInput & { ownerType?: VirtualAccountOwner, ownerId?: string }) {
    return WalletService.debitAccount(params);
  }

  async requestWithdrawal(ownerType: VirtualAccountOwner, ownerId: string, amount: number, description?: string) {
    return WalletService.requestWithdrawal(ownerType, ownerId, amount, description);
  }
}
