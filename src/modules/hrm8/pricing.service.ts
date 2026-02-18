import { BaseService } from '../../core/service';
import { PricingRepository } from './pricing.repository';
import { HttpException } from '../../core/http-exception';

export class PricingService extends BaseService {
    constructor(private pricingRepository: PricingRepository) {
        super();
    }

    private normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value.toLowerCase() === 'true';
        if (typeof value === 'number') return value !== 0;
        return defaultValue;
    }

    private parseOptionalDate(value: unknown, fieldName: string): Date | null | undefined {
        if (value === undefined) return undefined;
        if (value === null || value === '') return null;

        const parsed = value instanceof Date ? value : new Date(value as string);
        if (Number.isNaN(parsed.getTime())) {
            throw new HttpException(400, `Invalid ${fieldName} date value`);
        }
        return parsed;
    }

    private normalizeCode(value: unknown, fallback: string): string {
        const resolved = typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
        return resolved.toUpperCase();
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
        const isGlobal = data.isGlobal ?? data.is_global ?? false;
        const regionId = data.regionId ?? data.region_id;
        const isActive = data.isActive ?? data.is_active ?? true;
        const currency = this.normalizeCode(data.currency ?? data.billing_currency, 'USD');
        const billingCurrency = this.normalizeCode(data.billingCurrency ?? data.billing_currency, currency);
        const pricingPeg = this.normalizeCode(data.pricingPeg ?? data.pricing_peg, billingCurrency);
        const effectiveFrom = this.parseOptionalDate(
            data.effectiveFrom ?? data.effective_from,
            'effective_from'
        ) ?? new Date();
        const isApproved = this.normalizeBoolean(data.isApproved ?? data.is_approved, true);
        const approvedAt = this.parseOptionalDate(
            data.approvedAt ?? data.approved_at,
            'approved_at'
        ) ?? (isApproved ? new Date() : null);
        const approvedBy = data.approvedBy ?? data.approved_by ?? null;
        const version = data.version ?? 'v1';

        return this.pricingRepository.createPriceBook({
            name: data.name,
            description: data.description,
            is_global: isGlobal,
            region: regionId ? { connect: { id: regionId } } : undefined,
            currency,
            is_active: isActive,
            billing_currency: billingCurrency,
            pricing_peg: pricingPeg,
            effective_from: effectiveFrom,
            is_approved: isApproved,
            approved_at: isApproved ? approvedAt : null,
            approved_by: isApproved ? approvedBy : null,
            version,
        });
    }

    async updatePriceBook(id: string, data: any) {
        const isGlobal = data.isGlobal ?? data.is_global;
        const regionId = data.regionId ?? data.region_id;
        const isActive = data.isActive ?? data.is_active;
        const updateData: any = {
            name: data.name,
            description: data.description,
            is_global: isGlobal,
            is_active: isActive,
        };

        const requestedCurrency = data.currency;
        if (requestedCurrency !== undefined) {
            updateData.currency = this.normalizeCode(requestedCurrency, 'USD');
        }

        const requestedBillingCurrency = data.billingCurrency ?? data.billing_currency;
        if (requestedBillingCurrency !== undefined) {
            updateData.billing_currency = this.normalizeCode(
                requestedBillingCurrency,
                updateData.currency || 'USD'
            );
        }

        const requestedPricingPeg = data.pricingPeg ?? data.pricing_peg;
        if (requestedPricingPeg !== undefined) {
            updateData.pricing_peg = this.normalizeCode(
                requestedPricingPeg,
                updateData.billing_currency || updateData.currency || 'USD'
            );
        }

        if (data.effectiveFrom !== undefined || data.effective_from !== undefined) {
            updateData.effective_from = this.parseOptionalDate(
                data.effectiveFrom ?? data.effective_from,
                'effective_from'
            );
        }

        if (data.version !== undefined) {
            updateData.version = data.version;
        }

        if (data.isApproved !== undefined || data.is_approved !== undefined) {
            const isApproved = this.normalizeBoolean(data.isApproved ?? data.is_approved, false);
            updateData.is_approved = isApproved;
            updateData.approved_at = isApproved
                ? (this.parseOptionalDate(data.approvedAt ?? data.approved_at, 'approved_at') ?? new Date())
                : null;
            updateData.approved_by = isApproved ? (data.approvedBy ?? data.approved_by ?? null) : null;
        }

        if (regionId) {
            updateData.region = { connect: { id: regionId } };
        } else if (regionId === null) {
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
