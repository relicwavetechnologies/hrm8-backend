"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceBookSelectionService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
/**
 * Price Book Selection Service
 * Resolves effective price book and retrieves prices for products
 *
 * Resolution Order:
 * 1. Active EnterpriseOverride (if exists)
 * 2. Company-assigned PriceBook
 * 3. PriceBook matching pricing_peg + billing_currency
 * 4. Global USD fallback
 */
class PriceBookSelectionService {
    /**
     * Get effective price book for a company
     * Considers enterprise overrides and company settings
     */
    static async getEffectivePriceBook(companyId) {
        // 1. Get company details
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                pricing_peg: true,
                billing_currency: true,
                price_book_id: true,
                enterprise_overrides: {
                    where: {
                        is_active: true,
                        effective_from: { lte: new Date() },
                        OR: [
                            { effective_to: null },
                            { effective_to: { gte: new Date() } }
                        ]
                    },
                    orderBy: { effective_from: 'desc' },
                    take: 1,
                    include: { price_book: true }
                }
            }
        });
        if (!company) {
            throw new http_exception_1.HttpException(404, 'Company not found');
        }
        // 2. Check for active enterprise override
        if (company.enterprise_overrides.length > 0) {
            const override = company.enterprise_overrides[0];
            if (override.price_book_id && override.price_book) {
                console.log(`📌 Using enterprise override price book for company ${companyId}`);
                return override.price_book;
            }
        }
        // 3. Use company-assigned price book
        if (company.price_book_id) {
            const priceBook = await prisma_1.prisma.priceBook.findUnique({
                where: { id: company.price_book_id, is_active: true }
            });
            if (priceBook) {
                return priceBook;
            }
        }
        // 4. Find price book by pricing_peg and billing_currency
        const pricingPeg = company.pricing_peg || 'USD';
        const billingCurrency = company.billing_currency || 'USD';
        const priceBook = await prisma_1.prisma.priceBook.findFirst({
            where: {
                pricing_peg: pricingPeg,
                billing_currency: billingCurrency,
                is_active: true,
                is_approved: true,
                effective_from: { lte: new Date() },
                OR: [
                    { effective_to: null },
                    { effective_to: { gte: new Date() } }
                ]
            },
            orderBy: { effective_from: 'desc' }
        });
        if (priceBook) {
            return priceBook;
        }
        // 5. Fallback to global USD
        const fallback = await prisma_1.prisma.priceBook.findFirst({
            where: {
                is_global: true,
                is_active: true,
                is_approved: true
            },
            orderBy: { effective_from: 'desc' }
        });
        if (fallback) {
            console.warn(`⚠️  Using fallback USD price book for company ${companyId}`);
            return fallback;
        }
        throw new http_exception_1.HttpException(500, `No active price book found for company ${companyId} ` +
            `(peg: ${pricingPeg}, currency: ${billingCurrency})`);
    }
    /**
     * Get price for a specific product
     * Handles quantity tiers and executive search salary bands
     */
    static async getPriceForProduct(companyId, productCode, quantity = 1, salaryRange) {
        // 1. Get effective price book
        const priceBook = await this.getEffectivePriceBook(companyId);
        // 2. Find product
        const product = await prisma_1.prisma.product.findFirst({
            where: { code: productCode, is_active: true }
        });
        if (!product) {
            throw new http_exception_1.HttpException(404, `Product not found: ${productCode}`);
        }
        // 3. Find matching tier
        let tier;
        // If executive search with salary range, match by band
        if (productCode.startsWith('RECRUIT_EXEC_') && salaryRange) {
            tier = await prisma_1.prisma.priceTier.findFirst({
                where: {
                    price_book_id: priceBook.id,
                    product_id: product.id,
                    salary_band_min: { lte: salaryRange },
                    OR: [
                        { salary_band_max: null }, // No upper limit (Band 3)
                        { salary_band_max: { gte: salaryRange } }
                    ]
                },
                include: { product: true },
                orderBy: { salary_band_min: 'desc' } // Get highest band that matches
            });
        }
        else {
            // Normal quantity-based matching
            tier = await prisma_1.prisma.priceTier.findFirst({
                where: {
                    price_book_id: priceBook.id,
                    product_id: product.id,
                    min_quantity: { lte: quantity },
                    OR: [
                        { max_quantity: null },
                        { max_quantity: { gte: quantity } }
                    ]
                },
                include: { product: true },
                orderBy: { min_quantity: 'desc' }
            });
        }
        if (!tier) {
            throw new http_exception_1.HttpException(404, `No price tier found for product ${productCode} ` +
                `in price book ${priceBook.name} ` +
                `(quantity: ${quantity}, salary: ${salaryRange || 'N/A'})`);
        }
        return {
            price: tier.unit_price,
            currency: priceBook.billing_currency || priceBook.currency,
            tier,
            priceBook
        };
    }
    /**
     * Get subscription price for a specific plan type
     */
    static async getSubscriptionPrice(companyId, planType) {
        const productCode = `SUB_${planType}`;
        const result = await this.getPriceForProduct(companyId, productCode);
        return {
            price: result.price,
            currency: result.currency,
            priceBook: result.priceBook
        };
    }
    /**
     * Get recruitment service price
     * Handles executive search band matching
     */
    static async getRecruitmentPrice(companyId, serviceType, salaryRange) {
        const productCode = `RECRUIT_${serviceType}`;
        const result = await this.getPriceForProduct(companyId, productCode, 1, salaryRange);
        return {
            price: result.price,
            currency: result.currency,
            bandName: result.tier.band_name || undefined,
            tier: result.tier,
            priceBook: result.priceBook
        };
    }
    /**
     * Get all subscription tiers for a company (for pricing display)
     */
    static async getSubscriptionTiers(companyId) {
        const priceBook = await this.getEffectivePriceBook(companyId);
        const tiers = await prisma_1.prisma.priceTier.findMany({
            where: {
                price_book_id: priceBook.id,
                product: {
                    category: 'SUBSCRIPTION',
                    is_active: true
                }
            },
            include: { product: true },
            orderBy: { unit_price: 'asc' }
        });
        return tiers.map(tier => ({
            planType: tier.product.code.replace('SUB_', ''),
            name: tier.product.name,
            price: tier.unit_price,
            currency: priceBook.billing_currency || priceBook.currency
        }));
    }
    /**
     * Get all recruitment service prices for a company
     */
    static async getRecruitmentServicePrices(companyId) {
        const priceBook = await this.getEffectivePriceBook(companyId);
        const tiers = await prisma_1.prisma.priceTier.findMany({
            where: {
                price_book_id: priceBook.id,
                product: {
                    category: 'JOB_POSTING',
                    is_active: true
                }
            },
            include: { product: true },
            orderBy: [
                { product: { code: 'asc' } },
                { salary_band_min: 'asc' }
            ]
        });
        return tiers.map(tier => ({
            serviceType: tier.product.code.replace('RECRUIT_', ''),
            name: tier.product.name,
            price: tier.unit_price,
            currency: priceBook.billing_currency || priceBook.currency,
            bandName: tier.band_name || undefined,
            salaryMin: tier.salary_band_min ? Number(tier.salary_band_min) : undefined,
            salaryMax: tier.salary_band_max ? Number(tier.salary_band_max) : undefined
        }));
    }
}
exports.PriceBookSelectionService = PriceBookSelectionService;
