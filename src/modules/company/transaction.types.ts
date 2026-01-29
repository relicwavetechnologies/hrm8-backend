
export interface TransactionResponse {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    direction: 'CREDIT' | 'DEBIT';
    description?: string;
    status: string;
    createdAt: Date;
    referenceType?: string;
    referenceId?: string;
    metadata?: any;
}

export interface TransactionStats {
    totalCredits: number;
    totalDebits: number;
    balance: number;
    count: number;
}
