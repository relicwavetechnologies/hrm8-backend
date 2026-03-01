import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { AirwallexService } from '../airwallex/airwallex.service';
import { CommissionPayoutService } from './commission-payout.service';
import { Logger } from '../../utils/logger';

const log = Logger.create('payouts');

export class PayoutsService {

  async createBeneficiary(consultantId: string, bankDetails?: Record<string, unknown>) {
    const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    let beneficiaryId = consultant.airwallex_beneficiary_id || consultant.stripe_account_id;
    if (!beneficiaryId) {
      const result = await AirwallexService.createBeneficiary(consultantId, bankDetails || {});
      beneficiaryId = result.beneficiaryId;

      await prisma.consultant.update({
        where: { id: consultantId },
        data: {
          airwallex_beneficiary_id: beneficiaryId,
          stripe_account_id: beneficiaryId,
          stripe_account_status: 'active',
          payout_enabled: true,
          stripe_onboarded_at: new Date(),
        },
      });

      log.info('Beneficiary created', { consultantId, beneficiaryId });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const onboardingUrl = `${frontendUrl}/consultant360/earnings?airwallex_success=true`;

    return {
      provider: 'AIRWALLEX',
      accountId: beneficiaryId,
      onboardingUrl,
      accountLink: { url: onboardingUrl },
      status: 'active',
    };
  }

  async getStatus(consultantId: string) {
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
      select: {
        stripe_account_id: true,
        stripe_account_status: true,
        payout_enabled: true,
        stripe_onboarded_at: true,
      },
    });

    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const hasAccount = !!consultant.stripe_account_id;
    const payoutsEnabled = !!consultant.payout_enabled || consultant.stripe_account_status === 'active';

    return {
      provider: 'AIRWALLEX',
      hasAccount,
      accountId: consultant.stripe_account_id || undefined,
      accountStatus: consultant.stripe_account_status || null,
      payoutsEnabled,
      chargesEnabled: payoutsEnabled,
      detailsSubmitted: hasAccount,
      requiresAction: hasAccount && !payoutsEnabled,
      onboardedAt: consultant.stripe_onboarded_at || null,
      payoutEnabled: payoutsEnabled,
      isConnected: hasAccount && payoutsEnabled,
    };
  }

  async getLoginLink(consultantId: string) {
    const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
    if (!consultant) throw new HttpException(404, 'Consultant not found');
    if (!consultant.stripe_account_id) {
      throw new HttpException(400, 'Beneficiary not connected');
    }

    const url = `https://www.airwallex.com/app/login?beneficiary=${consultant.stripe_account_id}`;

    return {
      provider: 'AIRWALLEX',
      accountId: consultant.stripe_account_id,
      url,
      loginLink: url,
      dashboardUrl: url,
    };
  }

  async executeWithdrawal(withdrawalId: string, consultantId: string) {
    const withdrawal = await prisma.commissionWithdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');
    if (withdrawal.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');

    const result = await CommissionPayoutService.executeWithdrawalPayout(withdrawalId);

    log.info('Withdrawal payout executed', {
      withdrawalId,
      transferId: result.transferId,
      xeroBillId: result.xeroBillId,
      status: result.status,
    });

    return {
      provider: 'AIRWALLEX',
      transferId: result.transferId,
      xeroBillId: result.xeroBillId,
      status: result.status,
      message: result.status === 'COMPLETED'
        ? 'Payout completed — Airwallex transfer and Xero expense recorded'
        : 'Payout processing — Airwallex transfer initiated, awaiting completion webhook',
    };
  }
}
