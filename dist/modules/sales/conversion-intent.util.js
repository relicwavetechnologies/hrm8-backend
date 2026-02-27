"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeConversionIntentSnapshot = void 0;
const VALID_SETUP_TYPES = new Set(['SIMPLE', 'ADVANCED']);
const VALID_SERVICE_PACKAGES = new Set([
    'self-managed',
    'shortlisting',
    'full-service',
    'executive-search',
    'rpo',
]);
const VALID_SUBSCRIPTION_PLANS = new Set(['PAYG', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'RPO']);
const readString = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};
const readPositiveNumber = (value) => {
    if (value === null || value === undefined || value === '')
        return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return undefined;
    return Number(parsed.toFixed(2));
};
const normalizeConversionIntentSnapshot = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return undefined;
    }
    const source = raw;
    const intendedSetupTypeRaw = readString(source.intendedSetupType);
    const intendedSetupType = intendedSetupTypeRaw?.toUpperCase();
    const normalizedSetupType = intendedSetupType && VALID_SETUP_TYPES.has(intendedSetupType) ? intendedSetupType : undefined;
    const intendedServiceRaw = readString(source.intendedServicePackage);
    const normalizedService = intendedServiceRaw && VALID_SERVICE_PACKAGES.has(intendedServiceRaw.toLowerCase())
        ? intendedServiceRaw.toLowerCase()
        : undefined;
    const expectedPlanRaw = readString(source.expectedSubscriptionPlan);
    const expectedPlan = expectedPlanRaw?.toUpperCase();
    const normalizedPlan = expectedPlan && VALID_SUBSCRIPTION_PLANS.has(expectedPlan) ? expectedPlan : undefined;
    const expectedFirstPaymentAmount = readPositiveNumber(source.expectedFirstPaymentAmount);
    const expectedCurrencyRaw = readString(source.expectedCurrency);
    const expectedCurrency = expectedCurrencyRaw?.toUpperCase();
    const normalizedCurrency = expectedCurrency && expectedCurrency.length >= 3
        ? expectedCurrency.slice(0, 8)
        : undefined;
    const normalized = {};
    if (normalizedSetupType)
        normalized.intendedSetupType = normalizedSetupType;
    if (normalizedService)
        normalized.intendedServicePackage = normalizedService;
    if (normalizedPlan)
        normalized.expectedSubscriptionPlan = normalizedPlan;
    if (expectedFirstPaymentAmount !== undefined)
        normalized.expectedFirstPaymentAmount = expectedFirstPaymentAmount;
    if (normalizedCurrency)
        normalized.expectedCurrency = normalizedCurrency;
    if (Object.keys(normalized).length === 0) {
        return undefined;
    }
    normalized.snapshotVersion = 'v1';
    normalized.capturedAt = new Date().toISOString();
    return normalized;
};
exports.normalizeConversionIntentSnapshot = normalizeConversionIntentSnapshot;
