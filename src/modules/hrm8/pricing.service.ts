import { BaseService } from '../../core/service';
import { PricingRepository } from './pricing.repository';

export class PricingService extends BaseService {
    constructor(private pricingRepository: PricingRepository) {
        super();
    }

    async getProducts() {
        return this.pricingRepository.findAllProducts();
    }

    async getPriceBooks(regionId?: string, regionIds?: string[]) {
        return this.pricingRepository.findAllPriceBooks({ regionId, regionIds });
    }

    async upsertProduct(data: {
        id?: string;
        name: string;
        code: string;
        description?: string;
        category: string;
        is_active?: boolean;
    }) {
        return this.pricingRepository.upsertProduct({
            id: data.id,
            name: data.name,
            code: data.code,
            description: data.description,
            category: data.category,
            isActive: data.is_active,
        });
    }

    async upsertPriceBook(data: {
        id?: string;
        name: string;
        description?: string;
        is_global?: boolean;
        region_id?: string | null;
        currency?: string;
        is_active?: boolean;
    }) {
        return this.pricingRepository.upsertPriceBook({
            id: data.id,
            name: data.name,
            description: data.description,
            isGlobal: data.is_global,
            regionId: data.region_id ?? null,
            currency: data.currency,
            isActive: data.is_active,
        });
    }

    async upsertPriceTier(data: {
        id?: string;
        price_book_id: string;
        product_id: string;
        name: string;
        min_quantity?: number;
        max_quantity?: number | null;
        unit_price: number;
        period?: string;
    }) {
        return this.pricingRepository.upsertPriceTier({
            id: data.id,
            priceBookId: data.price_book_id,
            productId: data.product_id,
            name: data.name,
            minQuantity: data.min_quantity,
            maxQuantity: data.max_quantity ?? null,
            unitPrice: data.unit_price,
            period: data.period,
        });
    }
}
