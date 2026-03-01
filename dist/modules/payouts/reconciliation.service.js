"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const prisma_1 = require("../../utils/prisma");
const airwallex_service_1 = require("../airwallex/airwallex.service");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('reconciliation');
class ReconciliationService {
    static async runFullReconciliation() {
        log.info('Starting full reconciliation run');
        const runAt = new Date().toISOString();
        const [walletChecks, transferChecks, fxIntegrityChecks] = await Promise.all([
            this.checkWalletBalances(),
            this.checkTransferStatuses(),
            this.checkFxIntegrity(),
        ]);
        const summary = {
            totalIssues: walletChecks.filter((w) => w.status !== 'OK').length +
                transferChecks.filter((t) => t.status !== 'OK').length +
                fxIntegrityChecks.filter((f) => f.status !== 'OK').length,
            walletMismatches: walletChecks.filter((w) => w.status === 'MISMATCH').length,
            staleTransfers: transferChecks.filter((t) => t.status === 'STALE').length,
            fxDrift: fxIntegrityChecks.filter((f) => f.status === 'DRIFT').length,
        };
        log.info('Reconciliation complete', summary);
        return { runAt, walletChecks, transferChecks, fxIntegrityChecks, summary };
    }
    static async checkWalletBalances() {
        const results = [];
        const accounts = await prisma_1.prisma.virtualAccount.findMany({
            where: { owner_type: 'CONSULTANT', status: 'ACTIVE' },
            select: { owner_id: true, balance: true },
        });
        for (const account of accounts) {
            const transactions = await prisma_1.prisma.virtualTransaction.findMany({
                where: {
                    virtual_account: { owner_type: 'CONSULTANT', owner_id: account.owner_id },
                    status: 'COMPLETED',
                },
                select: { amount: true, direction: true },
            });
            let expectedBalance = 0;
            for (const tx of transactions) {
                expectedBalance += tx.direction === 'CREDIT' ? tx.amount : -tx.amount;
            }
            const delta = Math.abs(Number(account.balance) - expectedBalance);
            results.push({
                consultantId: account.owner_id,
                walletBalance: Number(account.balance),
                expectedBalance: Number(expectedBalance.toFixed(2)),
                delta: Number(delta.toFixed(2)),
                status: delta > 0.01 ? 'MISMATCH' : 'OK',
            });
        }
        return results;
    }
    static async checkTransferStatuses() {
        const results = [];
        const processingWithdrawals = await prisma_1.prisma.commissionWithdrawal.findMany({
            where: {
                status: 'PROCESSING',
                airwallex_transfer_id: { not: null },
            },
            select: {
                id: true,
                airwallex_transfer_id: true,
                status: true,
                transfer_initiated_at: true,
            },
        });
        for (const w of processingWithdrawals) {
            if (!w.airwallex_transfer_id)
                continue;
            const providerStatus = await airwallex_service_1.AirwallexService.getTransferStatus(w.airwallex_transfer_id);
            const hoursInProcessing = w.transfer_initiated_at
                ? (Date.now() - w.transfer_initiated_at.getTime()) / (1000 * 60 * 60)
                : 0;
            let status = 'OK';
            if (providerStatus.status !== w.status && providerStatus.status !== 'PROCESSING') {
                status = 'MISMATCH';
            }
            else if (hoursInProcessing > 24) {
                status = 'STALE';
            }
            results.push({
                withdrawalId: w.id,
                transferId: w.airwallex_transfer_id,
                localStatus: w.status,
                providerStatus: providerStatus.status,
                status,
                hoursInProcessing: Number(hoursInProcessing.toFixed(1)),
            });
        }
        return results;
    }
    static async checkFxIntegrity() {
        const results = [];
        const commissions = await prisma_1.prisma.commission.findMany({
            where: {
                fx_rate: { not: null },
                payout_amount: { not: null },
                status: { in: ['CONFIRMED', 'PAID'] },
            },
            select: {
                id: true,
                amount: true,
                currency: true,
                fx_rate: true,
                payout_amount: true,
            },
        });
        for (const c of commissions) {
            if (c.fx_rate == null || c.payout_amount == null)
                continue;
            const expected = Number((c.amount * c.fx_rate).toFixed(2));
            const actual = Number(c.payout_amount.toFixed(2));
            const drift = Math.abs(expected - actual);
            results.push({
                commissionId: c.id,
                amount: c.amount,
                currency: c.currency,
                fxRate: c.fx_rate,
                payoutAmount: actual,
                expectedPayoutAmount: expected,
                status: drift > 0.01 ? 'DRIFT' : 'OK',
            });
        }
        return results;
    }
}
exports.ReconciliationService = ReconciliationService;
