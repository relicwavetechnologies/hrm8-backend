"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionPayoutService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const airwallex_service_1 = require("../airwallex/airwallex.service");
const xero_service_1 = require("../xero/xero.service");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('commission-payout');
class CommissionPayoutService {
    /**
     * Full payout pipeline for an approved withdrawal:
     *   1. Debit consultant virtual wallet
     *   2. Create Xero ACCPAY bill (commission expense)
     *   3. Execute Airwallex transfer to beneficiary
     *   4. Record Xero payment against the bill
     *   5. Update withdrawal with provider references
     */
    static async executeWithdrawalPayout(withdrawalId) {
        const withdrawal = await prisma_1.prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId },
            include: { consultant: true },
        });
        if (!withdrawal)
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
            throw new http_exception_1.HttpException(400, 'Withdrawal must be in APPROVED or PROCESSING status');
        }
        const consultant = withdrawal.consultant;
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const beneficiaryId = consultant.airwallex_beneficiary_id || consultant.stripe_account_id;
        if (!beneficiaryId) {
            throw new http_exception_1.HttpException(400, 'Consultant does not have a payout beneficiary configured');
        }
        const payoutCurrency = withdrawal.payout_currency || withdrawal.currency || 'USD';
        const payoutAmount = Number(withdrawal.amount);
        return prisma_1.prisma.$transaction(async (tx) => {
            // 1. Debit wallet if not already done (wallet balance is in payout currency)
            if (!withdrawal.debited_from_wallet) {
                const account = await tx.virtualAccount.findUnique({
                    where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultant.id } },
                });
                if (!account)
                    throw new http_exception_1.HttpException(404, 'Consultant wallet not found');
                if (Number(account.balance) < payoutAmount) {
                    throw new http_exception_1.HttpException(400, 'Insufficient wallet balance');
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
            }
            // 2. Create Xero ACCPAY bill (expense)
            const xeroBill = xero_service_1.XeroService.createBill({
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
            log.info('Xero ACCPAY bill created', { xeroBillId: xeroBill.billId, amount: payoutAmount, currency: payoutCurrency });
            // 3. Execute Airwallex transfer
            const transferInput = {
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
            const transfer = await airwallex_service_1.AirwallexService.createTransfer(transferInput);
            log.info('Airwallex transfer initiated', { transferId: transfer.transferId, status: transfer.status });
            // 4. Record Xero payment against the bill
            let xeroPaymentId;
            if (transfer.status === 'COMPLETED') {
                const payment = xero_service_1.XeroService.createPayment({
                    invoiceId: xeroBill.billId,
                    amount: payoutAmount,
                    currency: payoutCurrency,
                    accountCode: '090',
                    reference: transfer.transferId,
                });
                xeroPaymentId = payment.paymentId;
                log.info('Xero payment recorded', { paymentId: payment.paymentId });
            }
            // 5. Update withdrawal with all references
            const finalStatus = transfer.status === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING';
            await tx.commissionWithdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: finalStatus,
                    airwallex_transfer_id: transfer.transferId,
                    xero_bill_id: xeroBill.billId,
                    payment_reference: xeroPaymentId || transfer.transferId,
                    transfer_initiated_at: new Date(),
                    ...(finalStatus === 'COMPLETED' ? { transfer_completed_at: new Date(), processed_at: new Date() } : {}),
                    payout_currency: payoutCurrency,
                    payout_amount: payoutAmount,
                },
            });
            // 6. Mark associated commissions as PAID
            if (finalStatus === 'COMPLETED' && withdrawal.commission_ids.length > 0) {
                await tx.commission.updateMany({
                    where: { id: { in: withdrawal.commission_ids } },
                    data: { status: 'PAID', paid_at: new Date(), payment_reference: transfer.transferId },
                });
            }
            return {
                transferId: transfer.transferId,
                xeroBillId: xeroBill.billId,
                status: finalStatus,
            };
        });
    }
    /**
     * Handle transfer webhook/status update from Airwallex.
     * Called when a PROCESSING transfer completes or fails.
     */
    static async handleTransferStatusUpdate(transferId, status, failedReason) {
        const withdrawal = await prisma_1.prisma.commissionWithdrawal.findFirst({
            where: { airwallex_transfer_id: transferId },
            include: { consultant: true },
        });
        if (!withdrawal) {
            log.warn('Transfer status update for unknown withdrawal', { transferId });
            return;
        }
        if (status === 'COMPLETED') {
            let xeroPaymentId;
            if (withdrawal.xero_bill_id) {
                const payment = xero_service_1.XeroService.createPayment({
                    invoiceId: withdrawal.xero_bill_id,
                    amount: Number(withdrawal.payout_amount || withdrawal.amount),
                    currency: withdrawal.payout_currency || 'USD',
                    accountCode: '090',
                    reference: transferId,
                });
                xeroPaymentId = payment.paymentId;
            }
            await prisma_1.prisma.$transaction(async (tx) => {
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
        }
        else if (status === 'FAILED') {
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.commissionWithdrawal.update({
                    where: { id: withdrawal.id },
                    data: { status: 'REJECTED', transfer_failed_reason: failedReason || 'Transfer failed' },
                });
                if (withdrawal.debited_from_wallet && withdrawal.virtual_transaction_id) {
                    const account = await tx.virtualAccount.findUnique({
                        where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: withdrawal.consultant_id } },
                    });
                    if (account) {
                        const refundAmount = withdrawal.payout_amount || withdrawal.amount;
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
            });
            log.error('Withdrawal transfer failed — wallet refunded', { withdrawalId: withdrawal.id, transferId, failedReason });
        }
    }
}
exports.CommissionPayoutService = CommissionPayoutService;
