import { prisma } from '../../utils/prisma';
import { AirwallexService } from '../airwallex/airwallex.service';
import { Logger } from '../../utils/logger';

const log = Logger.create('reconciliation');

export interface ReconciliationResult {
  runAt: string;
  walletChecks: WalletCheckResult[];
  transferChecks: TransferCheckResult[];
  summary: { totalIssues: number; walletMismatches: number; staleTransfers: number };
}

interface WalletCheckResult {
  consultantId: string;
  walletBalance: number;
  expectedBalance: number;
  delta: number;
  status: 'OK' | 'MISMATCH';
}

interface TransferCheckResult {
  withdrawalId: string;
  transferId: string;
  localStatus: string;
  providerStatus: string;
  status: 'OK' | 'STALE' | 'MISMATCH';
  hoursInProcessing?: number;
}

export class ReconciliationService {
  static async runFullReconciliation(): Promise<ReconciliationResult> {
    log.info('Starting full reconciliation run');
    const runAt = new Date().toISOString();

    const [walletChecks, transferChecks] = await Promise.all([
      this.checkWalletBalances(),
      this.checkTransferStatuses(),
    ]);

    const summary = {
      totalIssues:
        walletChecks.filter((w) => w.status !== 'OK').length +
        transferChecks.filter((t) => t.status !== 'OK').length,
      walletMismatches: walletChecks.filter((w) => w.status === 'MISMATCH').length,
      staleTransfers: transferChecks.filter((t) => t.status === 'STALE').length,
    };

    log.info('Reconciliation complete', summary);
    return { runAt, walletChecks, transferChecks, summary };
  }

  private static async checkWalletBalances(): Promise<WalletCheckResult[]> {
    const results: WalletCheckResult[] = [];

    const accounts = await prisma.virtualAccount.findMany({
      where: { owner_type: 'CONSULTANT', status: 'ACTIVE' },
      select: { owner_id: true, balance: true },
    });

    for (const account of accounts) {
      const transactions = await prisma.virtualTransaction.findMany({
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

  private static async checkTransferStatuses(): Promise<TransferCheckResult[]> {
    const results: TransferCheckResult[] = [];

    const processingWithdrawals = await prisma.commissionWithdrawal.findMany({
      where: {
        status: 'PROCESSING',
        stripe_transfer_id: { not: null },
      },
      select: {
        id: true,
        stripe_transfer_id: true,
        status: true,
        transfer_initiated_at: true,
      },
    });

    for (const w of processingWithdrawals) {
      if (!w.stripe_transfer_id) continue;

      const providerStatus = await AirwallexService.getTransferStatus(w.stripe_transfer_id);
      const hoursInProcessing = w.transfer_initiated_at
        ? (Date.now() - w.transfer_initiated_at.getTime()) / (1000 * 60 * 60)
        : 0;

      let status: TransferCheckResult['status'] = 'OK';
      if (providerStatus.status !== w.status && providerStatus.status !== 'PROCESSING') {
        status = 'MISMATCH';
      } else if (hoursInProcessing > 24) {
        status = 'STALE';
      }

      results.push({
        withdrawalId: w.id,
        transferId: w.stripe_transfer_id,
        localStatus: w.status,
        providerStatus: providerStatus.status,
        status,
        hoursInProcessing: Number(hoursInProcessing.toFixed(1)),
      });
    }

    return results;
  }

}
