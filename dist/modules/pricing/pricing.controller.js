"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingController = void 0;
const price_book_selection_service_1 = require("./price-book-selection.service");
const salary_band_service_1 = require("./salary-band.service");
const currency_assignment_service_1 = require("./currency-assignment.service");
const pricing_audit_service_1 = require("./pricing-audit.service");
class PricingController {
    /**
     * GET /api/pricing/subscription-tiers
     * Get all subscription pricing tiers for current company
     */
    static async getSubscriptionTiers(req, res) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID required'
                });
            }
            const tiers = await price_book_selection_service_1.PriceBookSelectionService.getSubscriptionTiers(companyId);
            res.json({
                success: true,
                data: { tiers }
            });
        }
        catch (error) {
            console.error('Get subscription tiers error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get subscription tiers'
            });
        }
    }
    /**
     * GET /api/pricing/recruitment-services
     * Get all recruitment service prices for current company
     */
    static async getRecruitmentServices(req, res) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID required'
                });
            }
            const services = await price_book_selection_service_1.PriceBookSelectionService.getRecruitmentServicePrices(companyId);
            res.json({
                success: true,
                data: { services }
            });
        }
        catch (error) {
            console.error('Get recruitment services error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get recruitment services'
            });
        }
    }
    /**
     * GET /api/pricing/executive-search-bands
     * Get all executive search salary bands for current company
     */
    static async getExecutiveSearchBands(req, res) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID required'
                });
            }
            const bands = await salary_band_service_1.SalaryBandService.getAllExecutiveSearchBands(companyId);
            res.json({
                success: true,
                data: { bands }
            });
        }
        catch (error) {
            console.error('Get executive search bands error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get executive search bands'
            });
        }
    }
    /**
     * POST /api/pricing/calculate-job-price
     * Calculate price for a job based on salary range
     */
    static async calculateJobPrice(req, res) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID required'
                });
            }
            const { salaryMax, serviceType } = req.body;
            if (!salaryMax || typeof salaryMax !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'Valid salaryMax is required'
                });
            }
            // Determine if executive search
            const bandInfo = await salary_band_service_1.SalaryBandService.determineJobBand(companyId, salaryMax);
            let price, currency, productCode;
            if (bandInfo.isExecutiveSearch) {
                price = bandInfo.price;
                currency = bandInfo.currency;
                productCode = bandInfo.productCode;
            }
            else {
                // Use regular recruitment service
                const serviceTypeToUse = serviceType || 'FULL';
                const result = await price_book_selection_service_1.PriceBookSelectionService.getRecruitmentPrice(companyId, serviceTypeToUse);
                price = result.price;
                currency = result.currency;
                productCode = result.tier.product.code;
            }
            res.json({
                success: true,
                data: {
                    isExecutiveSearch: bandInfo.isExecutiveSearch,
                    band: bandInfo.band,
                    price,
                    currency,
                    productCode,
                    salaryMax
                }
            });
        }
        catch (error) {
            console.error('Calculate job price error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to calculate job price'
            });
        }
    }
    /**
     * GET /api/pricing/company-currency
     * Get company's pricing peg and billing currency
     */
    static async getCompanyCurrency(req, res) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID required'
                });
            }
            const currencies = await currency_assignment_service_1.CurrencyAssignmentService.getCompanyCurrencies(companyId);
            res.json({
                success: true,
                data: currencies
            });
        }
        catch (error) {
            console.error('Get company currency error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get company currency'
            });
        }
    }
    /**
     * GET /api/pricing/audit/:companyId
     * Get pricing audit trail for a company (admin only)
     */
    static async getPricingAudit(req, res) {
        try {
            const companyId = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId;
            if (!companyId) {
                return res.status(400).json({ success: false, message: 'Company ID required' });
            }
            // TODO: Add admin permission check
            const audit = await pricing_audit_service_1.PricingAuditService.getCompanyPricingAudit(companyId);
            const consistency = await pricing_audit_service_1.PricingAuditService.validatePricingConsistency(companyId);
            res.json({
                success: true,
                data: {
                    transactions: audit,
                    consistency
                }
            });
        }
        catch (error) {
            console.error('Get pricing audit error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get pricing audit'
            });
        }
    }
}
exports.PricingController = PricingController;
