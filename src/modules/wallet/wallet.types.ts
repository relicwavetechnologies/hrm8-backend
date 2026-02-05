import { VirtualTransactionType } from '@prisma/client';

export interface CreditAccountInput {
    accountId?: string;
    amount: number;
    type: VirtualTransactionType;
    description?: string;
    referenceId?: string;
    referenceType?: string;
    createdBy?: string;
}

export interface DebitAccountInput {
    accountId?: string;
    amount: number;
    type: VirtualTransactionType;
    description?: string;
    referenceId?: string;
    referenceType?: string;
    createdBy?: string;
}

export interface WalletBalanceResponse {
    balance: number;
    totalCredits: number;
    totalDebits: number;
    currency: string;
    status: string;
}

export interface TransactionHistoryOptions {
    limit?: number;
    offset?: number;
}
