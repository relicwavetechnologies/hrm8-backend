"use strict";
/**
 * Billing provider environment configuration.
 *
 * BILLING_PROVIDER_MODE controls whether Airwallex + Xero calls are
 * real (`live`) or synthetic stubs (`mock`).
 *
 * In `live` mode the startup validator ensures all required credentials
 * are present so the process fails fast instead of producing runtime errors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILLING_PROVIDER_MODE = void 0;
exports.validateBillingEnv = validateBillingEnv;
const resolveMode = () => {
    const raw = (process.env.BILLING_PROVIDER_MODE || 'mock').toLowerCase();
    if (raw === 'live')
        return 'live';
    return 'mock';
};
exports.BILLING_PROVIDER_MODE = resolveMode();
const REQUIRED_AIRWALLEX_VARS = [
    'AIRWALLEX_API_KEY',
    'AIRWALLEX_CLIENT_ID',
    'AIRWALLEX_API_BASE_URL',
    'AIRWALLEX_WEBHOOK_SECRET',
];
const REQUIRED_XERO_VARS = [
    'XERO_CLIENT_ID',
    'XERO_CLIENT_SECRET',
    'XERO_TENANT_ID',
];
function validateBillingEnv() {
    if (exports.BILLING_PROVIDER_MODE !== 'live')
        return;
    const missing = [];
    for (const key of REQUIRED_AIRWALLEX_VARS) {
        if (!process.env[key])
            missing.push(key);
    }
    for (const key of REQUIRED_XERO_VARS) {
        if (!process.env[key])
            missing.push(key);
    }
    if (missing.length > 0) {
        throw new Error(`[billing-env] BILLING_PROVIDER_MODE=live but the following required env vars are missing: ${missing.join(', ')}`);
    }
}
