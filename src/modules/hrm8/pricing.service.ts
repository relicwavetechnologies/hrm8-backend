import { BaseService } from '../../core/service';
import { PricingRepository } from './pricing.repository';

export class PricingService extends BaseService {
    constructor(private pricingRepository: PricingRepository) {
        super();
    }

    // Products
    async upsertProduct(data: any) {
        return this.pricingRepository.upsertProduct(data);
    }

    async deleteProduct(id: string) {
        return this.pricingRepository.deleteProduct(id);
    }

    async getProducts() {
        return this.pricingRepository.findAllProducts();
    }

    // Price Books
    async getPriceBooks(regionId?: string, regionIds?: string[]) {
        return this.pricingRepository.findAllPriceBooks({ regionId, regionIds });
    }

    async getPriceBook(id: string) {
        return this.pricingRepository.findPriceBookById(id);
    }

    async createPriceBook(data: any) {
        return this.pricingRepository.createPriceBook({
            name: data.name,
            description: data.description,
            is_global: data.isGlobal,
            region: data.regionId ? { connect: { id: data.regionId } } : undefined,
            currency: data.currency || 'USD',
            is_active: data.isActive ?? true,
        });
    }

    async updatePriceBook(id: string, data: any) {
        const updateData: any = {
            name: data.name,
            description: data.description,
            is_global: data.isGlobal,
            currency: data.currency,
            is_active: data.isActive,
        };

        if (data.regionId) {
            updateData.region = { connect: { id: data.regionId } };
        } else if (data.regionId === null) {
            updateData.region = { disconnect: true };
        }

        return this.pricingRepository.updatePriceBook(id, updateData);
    }

    async deletePriceBook(id: string) {
        return this.pricingRepository.deletePriceBook(id);
    }

    // Price Tiers
    async createTier(priceBookId: string, data: any) {
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

    async updateTier(id: string, data: any) {
        return this.pricingRepository.updateTier(id, {
            name: data.name,
            min_quantity: data.minQuantity,
            max_quantity: data.maxQuantity,
            unit_price: data.unitPrice,
            period: data.period,
        });
    }

    async deleteTier(id: string) {
        return this.pricingRepository.deleteTier(id);
    }

    // Promo Codes
    async getPromoCodes() {
        return this.pricingRepository.findAllPromoCodes();
    }

    async createPromoCode(data: any) {
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

    async updatePromoCode(id: string, data: any) {
        const updateData: any = {
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

    async deletePromoCode(id: string) {
        return this.pricingRepository.deletePromoCode(id);
    }

    async validatePromoCode(code: string) {
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
