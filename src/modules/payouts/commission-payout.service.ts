import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { AirwallexService, type AirwallexTransferInput } from '../airwallex/airwallex.service';
import { XeroService } from '../xero/xero.service';
import { Logger } from '../../utils/logger';

const log = Logger.create('commission-payout');

export class CommissionPayoutService {
  /**
   * Full payout pipeline for an approved withdrawal:
   *   Phase 1 (DB): Debit wallet, set PROCESSING
   *   Phase 2 (external): Xero bill + Airwallex transfer
   *   Phase 3 (DB): Record provider refs, finalize status
   *   On Phase 2 failure: refund wallet
   */
  static async executeWithdrawalPayout(withdrawalId: string): Promise<{
    transferId: string;
    xeroBillId: string;
    status: string;
  }> {
    const withdrawal = await prisma.commissionWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { consultant: true },
    });

    if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');
    if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
      throw new HttpException(400, 'Withdrawal must be in APPROVED or PROCESSING status');
    }

    const consultant = withdrawal.consultant;
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const beneficiaryId = consultant.airwallex_beneficiary_id || consultant.stripe_account_id;
    if (!beneficiaryId) {
      throw new HttpException(400, 'Consultant does not have a payout beneficiary configured');
    }

    const payoutCurrency = withdrawal.payout_currency || withdrawal.currency || 'USD';
    const payoutAmount = Number(withdrawal.amount);

    // --- Phase 1: Debit wallet inside transaction ---
    if (!withdrawal.debited_from_wallet) {
      await prisma.$transaction(async (tx) => {
        const account = await tx.virtualAccount.findUnique({
          where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultant.id } },
        });

        if (!account) throw new HttpException(404, 'Consultant wallet not found');
        if (Number(account.balance) < payoutAmount) {
          throw new HttpException(400, 'Insufficient wallet balance');
        }

        const debitTx = await tx.virtualTransaction.create({
          data: {
            virtual_account_id: account.id,
            type: 'COMMISSION_WITHDRAWAL',
            amount: payoutAmount,
            balance_after: Number(account.balance) - payoutAmount,
            direction: 'DEBIT',
            status: 'COMPLETED',
            description: `Payout withdrawal: ${withdrawal.id}`,
            reference_id: withdrawal.id,
            reference_type: 'COMMISSION_WITHDRAWAL',
            withdrawal_request_id: withdrawal.id,
            billing_currency_used: payoutCurrency,
          },
        });

        await tx.virtualAccount.update({
          where: { id: account.id },
          data: { balance: { decrement: payoutAmount }, total_debits: { increment: payoutAmount } },
        });

        await tx.commissionWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            debited_from_wallet: true,
            virtual_transaction_id: debitTx.id,
            wallet_debit_at: new Date(),
            status: 'PROCESSING',
          },
        });
      });
      log.info('Phase 1 complete — wallet debited', { withdrawalId, payoutAmount });
    }

    // --- Phase 2: External calls (outside DB transaction) ---
    let xeroBillId: string;
    let transferId: string;
    let transferStatus: string;

    try {
      const xeroBill = XeroService.createBill({
        contactName: `${consultant.first_name} ${consultant.last_name}`,
        contactEmail: consultant.email,
        amount: payoutAmount,
        currency: payoutCurrency,
        description: `Commission payout for withdrawal ${withdrawal.id}`,
        reference: withdrawal.id,
        lineItems: [{
          description: `Commission payout (${withdrawal.commission_ids.length} commissions)`,
          amount: payoutAmount,
          accountCode: '400',
        }],
      });
      xeroBillId = xeroBill.billId;
      log.info('Xero ACCPAY bill created', { xeroBillId, amount: payoutAmount, currency: payoutCurrency });

      const transferInput: AirwallexTransferInput = {
        beneficiaryId,
        amount: payoutAmount,
        currency: payoutCurrency,
        reference: `HRM8-PAYOUT-${withdrawal.id.slice(0, 8)}`,
        reason: 'COMMISSION_PAYMENT',
        metadata: {
          withdrawalId: withdrawal.id,
          consultantId: consultant.id,
          commissionIds: withdrawal.commission_ids,
        },
      };

      const transfer = await AirwallexService.createTransfer(transferInput);
      transferId = transfer.transferId;
      transferStatus = transfer.status;
      log.info('Airwallex transfer initiated', { transferId, status: transferStatus });
    } catch (externalError: any) {
      log.error('Phase 2 failed — refunding wallet', { withdrawalId, error: externalError.message });

      await prisma.$transaction(async (tx) => {
        const account = await tx.virtualAccount.findUnique({
          where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultant.id } },
        });

        if (account) {
          await tx.virtualTransaction.create({
            data: {
              virtual_account_id: account.id,
              type: 'COMMISSION_ADJUSTMENT',
              amount: payoutAmount,
              balance_after: Number(account.balance) + payoutAmount,
              direction: 'CREDIT',
              status: 'COMPLETED',
              description: `Refund: payout failed for withdrawal ${withdrawal.id}`,
              reference_id: withdrawal.id,
              reference_type: 'COMMISSION_WITHDRAWAL',
              billing_currency_used: payoutCurrency,
            },
          });

          await tx.virtualAccount.update({
            where: { id: account.id },
            data: { balance: { increment: payoutAmount }, total_credits: { increment: payoutAmount } },
          });
        }

        await tx.commissionWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'REJECTED',
            transfer_failed_reason: externalError.message || 'External provider call failed',
          },
        });
      });

      throw new HttpException(502, `Payout failed: ${externalError.message}. Wallet has been refunded.`);
    }

    // --- Phase 3: Record provider references ---
    let xeroPaymentId: string | undefined;
    if (transferStatus === 'COMPLETED') {
      const payment = XeroService.createPayment({
        invoiceId: xeroBillId,
        amount: payoutAmount,
        currency: payoutCurrency,
        accountCode: '090',
        reference: transferId,
      });
      xeroPaymentId = payment.paymentId;
      log.info('Xero payment recorded', { paymentId: payment.paymentId });
    }

    const finalStatus = transferStatus === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING';

    await prisma.$transaction(async (tx) => {
      await tx.commissionWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: finalStatus as any,
          stripe_transfer_id: transferId,
          xero_bill_id: xeroBillId,
          payment_reference: xeroPaymentId || transferId,
          transfer_initiated_at: new Date(),
          ...(finalStatus === 'COMPLETED' ? { transfer_completed_at: new Date(), processed_at: new Date() } : {}),
          payout_currency: payoutCurrency,
          payout_amount: payoutAmount,
        },
      });

      if (finalStatus === 'COMPLETED' && withdrawal.commission_ids.length > 0) {
        await tx.commission.updateMany({
          where: { id: { in: withdrawal.commission_ids } },
          data: { status: 'PAID', paid_at: new Date(), payment_reference: transferId },
        });
      }
    });

    return { transferId, xeroBillId, status: finalStatus };
  }

  /**
   * Handle transfer webhook/status update from Airwallex.
   */
  static async handleTransferStatusUpdate(transferId: string, status: 'COMPLETED' | 'FAILED', failedReason?: string) {
    const withdrawal = await prisma.commissionWithdrawal.findFirst({
      where: { stripe_transfer_id: transferId },
      include: { consultant: true },
    });

    if (!withdrawal) {
      log.warn('Transfer status update for unknown withdrawal', { transferId });
      return;
    }

    if (status === 'COMPLETED') {
      let xeroPaymentId: string | undefined;

      if (withdrawal.xero_bill_id) {
        const payment = XeroService.createPayment({
          invoiceId: withdrawal.xero_bill_id,
          amount: Number(withdrawal.payout_amount || withdrawal.amount),
          currency: withdrawal.payout_currency || 'USD',
          accountCode: '090',
          reference: transferId,
        });
        xeroPaymentId = payment.paymentId;
      }

      await prisma.$transaction(async (tx) => {
        await tx.commissionWithdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: 'COMPLETED',
            transfer_completed_at: new Date(),
            processed_at: new Date(),
            payment_reference: xeroPaymentId || transferId,
          },
        });

        if (withdrawal.commission_ids.length > 0) {
          await tx.commission.updateMany({
            where: { id: { in: withdrawal.commission_ids } },
            data: { status: 'PAID', paid_at: new Date(), payment_reference: transferId },
          });
        }
      });

      log.info('Withdrawal completed', { withdrawalId: withdrawal.id, transferId, xeroPaymentId });
    } else if (status === 'FAILED') {
      await prisma.$transaction(async (tx) => {
        await tx.commissionWithdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'REJECTED', transfer_failed_reason: failedReason || 'Transfer failed' },
        });

        // Refund wallet if it was debited
        if (withdrawal.debited_from_wallet) {
          const account = await tx.virtualAccount.findUnique({
            where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: withdrawal.consultant_id } },
          });

          if (account) {
            const refundAmount = Number(withdrawal.payout_amount || withdrawal.amount);
            await tx.virtualTransaction.create({
              data: {
                virtual_account_id: account.id,
                type: 'COMMISSION_ADJUSTMENT',
                amount: refundAmount,
                balance_after: Number(account.balance) + refundAmount,
                direction: 'CREDIT',
                status: 'COMPLETED',
                description: `Refund: payout transfer failed (${transferId})`,
                reference_id: withdrawal.id,
                reference_type: 'COMMISSION_WITHDRAWAL',
                billing_currency_used: withdrawal.payout_currency || 'USD',
              },
            });

            await tx.virtualAccount.update({
              where: { id: account.id },
              data: { balance: { increment: refundAmount }, total_credits: { increment: refundAmount } },
            });
          }
        }

        // Revert commissions from PAID back to CONFIRMED
        if (withdrawal.commission_ids.length > 0) {
          await tx.commission.updateMany({
            where: { id: { in: withdrawal.commission_ids }, status: 'PAID' },
            data: { status: 'CONFIRMED', paid_at: null, payment_reference: null },
          });
        }
      });

      log.error('Withdrawal transfer failed — wallet refunded', { withdrawalId: withdrawal.id, transferId, failedReason });
    }
  }
}
