import { prisma } from '../../utils/prisma';
import { AirwallexFxService } from '../airwallex/airwallex-fx.service';

export interface CommissionFxResult {
  currency: string;
  payoutCurrency: string;
  payoutAmount: number;
  fxRate: number;
  fxSource: string;
}

/**
 * Resolve commission amount in consultant's payout currency.
 * If source === payout, returns same amount with fxRate 1.
 */
export async function resolveCommissionFx(
  consultantId: string,
  sourceCurrency: string,
  sourceAmount: number
): Promise<CommissionFxResult> {
  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    select: { payout_currency: true, default_currency: true },
  });

  const payoutCurrency = consultant?.payout_currency || consultant?.default_currency || 'USD';
  const src = sourceCurrency.toUpperCase() || 'USD';
  const dst = payoutCurrency.toUpperCase();

  if (src === dst) {
    return {
      currency: src,
      payoutCurrency: dst,
      payoutAmount: sourceAmount,
      fxRate: 1,
      fxSource: 'SAME_CURRENCY',
    };
  }

  const quote = await AirwallexFxService.getQuote(src, dst);
  const { payoutAmount, fxRate, fxSource } = AirwallexFxService.resolveFxFields(
    src,
    dst,
    sourceAmount,
    quote
  );

  return {
    currency: src,
    payoutCurrency: dst,
    payoutAmount,
    fxRate,
    fxSource,
  };
}
