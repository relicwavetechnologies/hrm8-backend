import { HttpException } from '../../core/http-exception';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';
import { FeatureFlags } from '../../config/feature-flags';

export type LeadForConversion = { region_id: string | null; assigned_consultant_id: string | null; created_by: string | null; referred_by: string | null };
export type ConsultantForConversion = { id: string; region_id: string | null };

/**
 * Assert lead is in consultant's region scope (strict governance).
 * Rejects with 403 LEAD_OUTSIDE_REGION_SCOPE if not.
 */
export function assertLeadInConsultantRegion(
  lead: LeadForConversion,
  consultant: ConsultantForConversion
): void {
  if (!FeatureFlags.FF_STRICT_REGION_CURRENCY_GATE) return;

  if (!consultant.region_id) {
    throw new HttpException(
      403,
      'Consultant does not have an assigned region. Conversion requests require region assignment.',
      'LEAD_OUTSIDE_REGION_SCOPE'
    );
  }
  if (lead.region_id !== consultant.region_id) {
    throw new HttpException(
      403,
      'Lead is outside your region scope. You can only submit conversion requests for leads in your assigned region.',
      'LEAD_OUTSIDE_REGION_SCOPE'
    );
  }
  const isOwner =
    lead.assigned_consultant_id === consultant.id ||
    lead.created_by === consultant.id ||
    lead.referred_by === consultant.id;
  if (!isOwner) {
    throw new HttpException(
      403,
      'You do not have ownership of this lead. Only the assigned consultant, creator, or referrer can submit conversion requests.',
      'LEAD_OUTSIDE_REGION_SCOPE'
    );
  }
}

/**
 * Validate region has active currency mapping (strict governance).
 * Throws REGION_CURRENCY_MAPPING_MISSING or REGION_COUNTRY_UNRESOLVABLE on failure.
 */
export async function validateRegionCurrencyMapping(regionId: string): Promise<{
  pricingPeg: string;
  billingCurrency: string;
  countryCode: string;
}> {
  if (!FeatureFlags.FF_STRICT_REGION_CURRENCY_GATE) {
    return { pricingPeg: 'USD', billingCurrency: 'USD', countryCode: 'US' };
  }
  const result = await CurrencyAssignmentService.resolveRegionCurrencyOrThrow(regionId);
  return {
    pricingPeg: result.pricingPeg,
    billingCurrency: result.billingCurrency,
    countryCode: result.countryCode,
  };
}
