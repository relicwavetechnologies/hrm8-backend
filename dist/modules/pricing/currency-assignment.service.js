"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyAssignmentService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
/**
 * Maps country name (e.g. "India", "United States") to ISO country code for pricing map lookup
 */
const COUNTRY_NAME_TO_CODE = {
    India: 'IN', 'United States': 'US', USA: 'US', America: 'US',
    Australia: 'AU', 'New Zealand': 'NZ', UK: 'GB', 'United Kingdom': 'GB',
    Ireland: 'IE', Germany: 'DE', France: 'FR', Netherlands: 'NL', Spain: 'ES',
    Italy: 'IT', Belgium: 'BE', Austria: 'AT', Finland: 'FI', Portugal: 'PT',
    Luxembourg: 'LU', Pakistan: 'PK', 'Sri Lanka': 'LK', Bangladesh: 'BD',
    Canada: 'CA', Singapore: 'SG', 'Hong Kong': 'HK', Japan: 'JP',
    'South Korea': 'KR', Malaysia: 'MY', Thailand: 'TH', Philippines: 'PH',
    Indonesia: 'ID', Vietnam: 'VN', UAE: 'AE', 'United Arab Emirates': 'AE',
    'Saudi Arabia': 'SA', Qatar: 'QA', Kuwait: 'KW', Bahrain: 'BH', Oman: 'OM',
    Israel: 'IL', Mexico: 'MX', Brazil: 'BR', Argentina: 'AR', Chile: 'CL',
    Colombia: 'CO', 'South Africa': 'ZA', Nigeria: 'NG', Kenya: 'KE', Egypt: 'EG',
    Switzerland: 'CH', Norway: 'NO', Sweden: 'SE', Denmark: 'DK', Poland: 'PL',
};
/**
 * Currency Assignment Service
 * Handles pricing peg and billing currency assignment and locking
 *
 * Based on HRM8 Global Pricing & Billing Rules:
 * - Pricing peg and billing currency are set ONCE at company creation
 * - Currency locks after first payment (immutable)
 * - No dynamic FX conversion allowed
 */
class CurrencyAssignmentService {
    /**
     * Resolve country code from country name, region, or raw code
     */
    static async resolveCountryCode(countryOrRegion, regionId) {
        if (regionId) {
            const region = await prisma_1.prisma.region.findUnique({
                where: { id: regionId },
                select: { country: true }
            });
            if (region?.country) {
                const code = COUNTRY_NAME_TO_CODE[region.country] ??
                    (region.country.length === 2 ? region.country.toUpperCase() : null);
                if (code)
                    return code;
                // Fallback: lookup by country_name in CountryPricingMap
                const map = await prisma_1.prisma.countryPricingMap.findFirst({
                    where: {
                        OR: [
                            { country_name: { equals: region.country, mode: 'insensitive' } },
                            { country_name: { contains: region.country, mode: 'insensitive' } }
                        ],
                        is_active: true
                    },
                    select: { country_code: true }
                });
                if (map)
                    return map.country_code;
            }
        }
        if (countryOrRegion) {
            const trimmed = String(countryOrRegion).trim();
            if (trimmed.length === 2)
                return trimmed.toUpperCase();
            const code = COUNTRY_NAME_TO_CODE[trimmed];
            if (code)
                return code;
            // Fallback: lookup by country_name in CountryPricingMap
            const map = await prisma_1.prisma.countryPricingMap.findFirst({
                where: {
                    OR: [
                        { country_name: { equals: trimmed, mode: 'insensitive' } },
                        { country_name: { contains: trimmed, mode: 'insensitive' } }
                    ],
                    is_active: true
                },
                select: { country_code: true }
            });
            if (map)
                return map.country_code;
        }
        return null;
    }
    /**
     * Assign pricing peg and billing currency to a company based on country
     * Called during company creation
     */
    static async assignCurrencyToCompany(companyId, countryCode) {
        // 1. Check if company already has currencies assigned
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: { pricing_peg: true, billing_currency: true, currency_locked_at: true }
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        // 2. If currency is locked, cannot reassign
        if (company.currency_locked_at) {
            throw new http_exception_1.HttpException(400, 'Currency is locked and cannot be changed. ' +
                `Locked at: ${company.currency_locked_at.toISOString()}`);
        }
        // 3. Look up country in pricing map
        const countryMapping = await prisma_1.prisma.countryPricingMap.findUnique({
            where: { country_code: countryCode.toUpperCase() }
        });
        let pricingPeg = 'USD';
        let billingCurrency = 'USD';
        if (countryMapping && countryMapping.is_active) {
            pricingPeg = countryMapping.pricing_peg;
            billingCurrency = countryMapping.billing_currency;
        }
        else {
            console.warn(`Country ${countryCode} not found in pricing map. Defaulting to USD.`);
        }
        // 4. Update company with assigned currencies
        await prisma_1.prisma.company.update({
            where: { id: companyId },
            data: {
                pricing_peg: pricingPeg,
                billing_currency: billingCurrency,
                country: countryCode.toUpperCase()
            }
        });
        console.log(`✅ Assigned currencies to company ${companyId}: ${pricingPeg} pricing, ${billingCurrency} billing`);
        return { pricingPeg, billingCurrency };
    }
    /**
     * Lock currency after first payment
     * Makes pricing_peg and billing_currency immutable
     */
    static async lockCurrency(companyId) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: { currency_locked_at: true, pricing_peg: true, billing_currency: true }
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        // Already locked, skip
        if (company.currency_locked_at) {
            return;
        }
        // Lock currency
        await prisma_1.prisma.company.update({
            where: { id: companyId },
            data: { currency_locked_at: new Date() }
        });
        console.log(`🔒 Currency locked for company ${companyId} at ${new Date().toISOString()}`);
    }
    /**
     * Validate that currency is locked and matches expected currency
     * Called before processing any payment
     */
    static async validateCurrencyLock(companyId, expectedCurrency) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                billing_currency: true,
                currency_locked_at: true,
                pricing_peg: true
            }
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        // If currency is locked, must match
        if (company.currency_locked_at) {
            if (company.billing_currency !== expectedCurrency) {
                throw new http_exception_1.HttpException(400, `Currency mismatch. Company billing currency is locked to ${company.billing_currency}. ` +
                    `Cannot process payment in ${expectedCurrency}.`);
            }
        }
    }
    /**
     * Check if currency can be changed (not locked)
     */
    static async canChangeCurrency(companyId) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: { currency_locked_at: true }
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        return !company.currency_locked_at;
    }
    /**
     * Get company's assigned currencies
     */
    static async getCompanyCurrencies(companyId) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                pricing_peg: true,
                billing_currency: true,
                currency_locked_at: true
            }
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        return {
            pricingPeg: company.pricing_peg || 'USD',
            billingCurrency: company.billing_currency || 'USD',
            isLocked: !!company.currency_locked_at,
            lockedAt: company.currency_locked_at
        };
    }
    /**
     * Emergency override - change currency (admin only, requires approval)
     * Creates audit trail via EnterpriseOverride
     */
    static async emergencyOverride(companyId, newPricingPeg, newBillingCurrency, adminUserId, reason) {
        // This is a dangerous operation - should require multiple approvals
        console.warn(`⚠️  EMERGENCY CURRENCY OVERRIDE for company ${companyId}`);
        console.warn(`   Old: ${await this.getCompanyCurrencies(companyId)}`);
        console.warn(`   New: ${newPricingPeg} / ${newBillingCurrency}`);
        console.warn(`   Reason: ${reason}`);
        console.warn(`   Admin: ${adminUserId}`);
        // Create enterprise override record for audit
        await prisma_1.prisma.enterpriseOverride.create({
            data: {
                company_id: companyId,
                pricing_peg: newPricingPeg,
                billing_currency: newBillingCurrency,
                scope: ['SUBSCRIPTION', 'RECRUITMENT', 'ASSESSMENTS'],
                effective_from: new Date(),
                created_by: adminUserId,
                approved_by: adminUserId,
                is_active: true,
                notes: `Emergency override: ${reason}`
            }
        });
        // Update company (this bypasses the lock)
        await prisma_1.prisma.company.update({
            where: { id: companyId },
            data: {
                pricing_peg: newPricingPeg,
                billing_currency: newBillingCurrency,
                // Reset lock to allow new currency to establish
                currency_locked_at: null
            }
        });
        console.log(`✅ Emergency override completed for company ${companyId}`);
    }
}
exports.CurrencyAssignmentService = CurrencyAssignmentService;
