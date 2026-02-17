"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const service_1 = require("../../core/service");
class PricingService extends service_1.BaseService {
    constructor(pricingRepository) {
        super();
        this.pricingRepository = pricingRepository;
    }
    // Products
    async upsertProduct(data) {
        return this.pricingRepository.upsertProduct(data);
    }
    async deleteProduct(id) {
        return this.pricingRepository.deleteProduct(id);
    }
    async getProducts() {
        return this.pricingRepository.findAllProducts();
    }
    // Price Books
    async getPriceBooks(regionId, regionIds) {
        return this.pricingRepository.findAllPriceBooks({ regionId, regionIds });
    }
    async getPriceBook(id) {
        return this.pricingRepository.findPriceBookById(id);
    }
    async createPriceBook(data) {
        const isGlobal = data.isGlobal ?? data.is_global ?? false;
        const regionId = data.regionId ?? data.region_id;
        const isActive = data.isActive ?? data.is_active ?? true;
        return this.pricingRepository.createPriceBook({
            name: data.name,
            description: data.description,
            is_global: isGlobal,
            region: regionId ? { connect: { id: regionId } } : undefined,
            currency: data.currency || 'USD',
            is_active: isActive,
        });
    }
    async updatePriceBook(id, data) {
        const isGlobal = data.isGlobal ?? data.is_global;
        const regionId = data.regionId ?? data.region_id;
        const isActive = data.isActive ?? data.is_active;
        const updateData = {
            name: data.name,
            description: data.description,
            is_global: isGlobal,
            currency: data.currency,
            is_active: isActive,
        };
        if (regionId) {
            updateData.region = { connect: { id: regionId } };
        }
        else if (regionId === null) {
            updateData.region = { disconnect: true };
        }
        return this.pricingRepository.updatePriceBook(id, updateData);
    }
    async deletePriceBook(id) {
        return this.pricingRepository.deletePriceBook(id);
    }
    // Price Tiers
    async createTier(priceBookId, data) {
        return this.pricingRepository.createTier({
            price_book: { connect: { id: priceBookId } },
            product: { connect: { id: data.productId } },
            name: data.name,
            min_quantity: data.minQuantity,
            max_quantity: data.maxQuantity,
            unit_price: data.unitPrice,
            period: data.period || 'MONTHLY',
        });
    }
    async updateTier(id, data) {
        return this.pricingRepository.updateTier(id, {
            name: data.name,
            min_quantity: data.minQuantity,
            max_quantity: data.maxQuantity,
            unit_price: data.unitPrice,
            period: data.period,
        });
    }
    async deleteTier(id) {
        return this.pricingRepository.deleteTier(id);
    }
    // Promo Codes
    async getPromoCodes() {
        return this.pricingRepository.findAllPromoCodes();
    }
    async createPromoCode(data) {
        return this.pricingRepository.createPromoCode({
            code: data.code,
            description: data.description,
            discount_type: data.discountType,
            discount_value: data.discountValue,
            start_date: new Date(data.startDate),
            end_date: data.endDate ? new Date(data.endDate) : null,
            max_uses: data.maxUses,
            is_active: data.isActive ?? true,
        });
    }
    async updatePromoCode(id, data) {
        const updateData = {
            code: data.code,
            description: data.description,
            discount_type: data.discountType,
            discount_value: data.discountValue,
            start_date: data.startDate ? new Date(data.startDate) : undefined,
            end_date: data.endDate ? new Date(data.endDate) : undefined, // allow null to clear
            max_uses: data.maxUses,
            is_active: data.isActive,
        };
        return this.pricingRepository.updatePromoCode(id, updateData);
    }
    async deletePromoCode(id) {
        return this.pricingRepository.deletePromoCode(id);
    }
    async validatePromoCode(code) {
        const promo = await this.pricingRepository.findPromoCodeByCode(code);
        if (!promo) {
            return { valid: false, discount: 0, message: 'Invalid promo code' };
        }
        if (!promo.is_active) {
            return { valid: false, discount: 0, message: 'Promo code is inactive' };
        }
        const now = new Date();
        if (now < promo.start_date) {
            return { valid: false, discount: 0, message: 'Promo code is not yet active' };
        }
        if (promo.end_date && now > promo.end_date) {
            return { valid: false, discount: 0, message: 'Promo code has expired' };
        }
        if (promo.max_uses && promo.used_count >= promo.max_uses) {
            return { valid: false, discount: 0, message: 'Promo code usage limit reached' };
        }
        return {
            valid: true,
            discount: promo.discount_value,
            discountType: promo.discount_type,
            code: promo.code,
            id: promo.id
        };
    }
}
exports.PricingService = PricingService;
