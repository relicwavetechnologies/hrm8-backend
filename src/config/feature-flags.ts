/**
 * Phased feature flags for HRM8 Stability Completion Plan.
 *
 * Flags are driven by environment variables so they can be toggled
 * per-environment without code changes. Defaults are `true` (on)
 * for testing; set to '0' or 'false' to disable individually.
 */

const bool = (key: string, fallback = true): boolean => {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
};

export const FeatureFlags = {
  FF_MANAGED_CHECKOUT_V2: bool('FF_MANAGED_CHECKOUT_V2'),
  FF_COMPANY_360: bool('FF_COMPANY_360'),
  FF_COUNTRY_MAP_UI: bool('FF_COUNTRY_MAP_UI'),
  FF_INTENT_SNAPSHOT_STRICT: bool('FF_INTENT_SNAPSHOT_STRICT'),
  FF_STRIPE_LABEL_CLEANUP: bool('FF_STRIPE_LABEL_CLEANUP'),
} as const;

export type FeatureFlagKey = keyof typeof FeatureFlags;

export const isFeatureEnabled = (key: FeatureFlagKey): boolean => FeatureFlags[key];
