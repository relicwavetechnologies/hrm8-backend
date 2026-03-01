import { Logger } from './logger';

const log = Logger.create('billing');

export const BillingLogger = {
  checkoutInitiated(data: {
    companyId: string;
    checkoutType: string;
    amount: number;
    currency: string;
    billId: string;
    paymentAttemptId: string;
  }) {
    log.info('Checkout initiated', data);
  },

  paymentPending(data: {
    companyId: string;
    paymentAttemptId: string;
    checkoutUrl: string;
    amount: number;
    currency: string;
    jobId?: string;
  }) {
    log.info('Payment pending – awaiting external confirmation', data);
  },

  paymentCompleted(data: {
    companyId: string;
    billId: string;
    paymentAttemptId: string;
    checkoutType: string;
    amount: number;
    currency: string;
  }) {
    log.info('Payment completed', data);
  },

  assignmentSuccess(data: {
    jobId: string;
    consultantId: string;
    servicePackage: string;
  }) {
    log.info('Consultant auto-assignment succeeded', data);
  },

  assignmentFailure(data: {
    jobId: string;
    servicePackage: string;
    reason: string;
    refundIssued: boolean;
  }) {
    log.warn('Consultant auto-assignment failed', data);
  },

  refundIssued(data: {
    paymentAttemptId: string;
    billId?: string;
    reason: string;
    amount?: number;
    currency?: string;
  }) {
    log.info('Refund issued', data);
  },
};
