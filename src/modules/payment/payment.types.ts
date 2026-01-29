import { ServicePackage } from '../pricing/pricing.constants';

export interface WalletPaymentCheckResult {
  canPay: boolean;
  requiredAmount: number;
  currentBalance: number;
  deficit?: number;
  message: string;
  errorCode?: string;
}

export interface WalletPaymentResult {
  success: boolean;
  transactionId?: string;
  jobId: string;
  amount: number;
  packageName: ServicePackage;
  previousBalance: number;
  newBalance: number;
  paymentCompletedAt?: Date;
  commissionCreated?: boolean;
  commissionId?: string;
  error?: string;
  errorCode?: string;
}

export interface PaymentProcessingContext {
  jobId: string;
  companyId: string;
  userId?: string;
  jobTitle?: string;
  servicePackage: ServicePackage;
  amount: number;
}

export interface PaymentCheckContext {
  companyId: string;
  servicePackage: ServicePackage;
  amount: number;
}
