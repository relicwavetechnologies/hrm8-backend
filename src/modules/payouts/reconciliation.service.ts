import { prisma } from '../../utils/prisma';
import { AirwallexService } from '../airwallex/airwallex.service';
import { Logger } from '../../utils/logger';

const log = Logger.create('reconciliation');

export interface ReconciliationResult {
  runAt: string;
  walletChecks: WalletCheckResult[];
  transferChecks: TransferCheckResult[];
  fxIntegrityChecks: FxIntegrityResult[];
  summary: { totalIssues: number; walletMismatches: number; staleTransfers: number; fxDrift: number };
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

interface FxIntegrityResult {
  commissionId: string;
  amount: number;
  currency: string;
  fxRate: number;
  payoutAmount: number;
  expectedPayoutAmount: number;
  status: 'OK' | 'DRIFT';
}

export class ReconciliationService {
  static async runFullReconciliation(): Promise<ReconciliationResult> {
    log.info('Starting full reconciliation run');
    const runAt = new Date().toISOString();

    const [walletChecks, transferChecks, fxIntegrityChecks] = await Promise.all([
      this.checkWalletBalances(),
      this.checkTransferStatuses(),
      this.checkFxIntegrity(),
    ]);

    const summary = {
      totalIssues:
        walletChecks.filter((w) => w.status !== 'OK').length +
        transferChecks.filter((t) => t.status !== 'OK').length +
        fxIntegrityChecks.filter((f) => f.status !== 'OK').length,
      walletMismatches: walletChecks.filter((w) => w.status === 'MISMATCH').length,
      staleTransfers: transferChecks.filter((t) => t.status === 'STALE').length,
      fxDrift: fxIntegrityChecks.filter((f) => f.status === 'DRIFT').length,
    };

    log.info('Reconciliation complete', summary);
    return { runAt, walletChecks, transferChecks, fxIntegrityChecks, summary };
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
      if (!w.airwallex_transfer_id) continue;

      const providerStatus = await AirwallexService.getTransferStatus(w.airwallex_transfer_id);
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
        transferId: w.airwallex_transfer_id,
        localStatus: w.status,
        providerStatus: providerStatus.status,
        status,
        hoursInProcessing: Number(hoursInProcessing.toFixed(1)),
      });
    }

    return results;
  }

  private static async checkFxIntegrity(): Promise<FxIntegrityResult[]> {
    const results: FxIntegrityResult[] = [];

    const commissions = await prisma.commission.findMany({
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
      if (c.fx_rate == null || c.payout_amount == null) continue;
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
