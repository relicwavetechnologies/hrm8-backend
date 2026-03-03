"use strict";
/**
 * Phased feature flags for HRM8 Stability Completion Plan.
 *
 * Flags are driven by environment variables so they can be toggled
 * per-environment without code changes. Defaults are `true` (on)
 * for testing; set to '0' or 'false' to disable individually.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeatureEnabled = exports.FeatureFlags = void 0;
const bool = (key, fallback = true) => {
    const raw = process.env[key];
    if (raw === undefined)
        return fallback;
    return raw === '1' || raw.toLowerCase() === 'true';
};
exports.FeatureFlags = {
    FF_MANAGED_CHECKOUT_V2: bool('FF_MANAGED_CHECKOUT_V2'),
    FF_COMPANY_360: bool('FF_COMPANY_360'),
    FF_COUNTRY_MAP_UI: bool('FF_COUNTRY_MAP_UI'),
    FF_INTENT_SNAPSHOT_STRICT: bool('FF_INTENT_SNAPSHOT_STRICT'),
    FF_STRIPE_LABEL_CLEANUP: bool('FF_STRIPE_LABEL_CLEANUP'),
    FF_STRICT_REGION_CURRENCY_GATE: bool('FF_STRICT_REGION_CURRENCY_GATE', false),
    FF_DISABLE_DIRECT_CONVERT: bool('FF_DISABLE_DIRECT_CONVERT', false),
    FF_COMMISSION_CURRENCY_STRICT: bool('FF_COMMISSION_CURRENCY_STRICT', false),
};
const isFeatureEnabled = (key) => exports.FeatureFlags[key];
exports.isFeatureEnabled = isFeatureEnabled;
