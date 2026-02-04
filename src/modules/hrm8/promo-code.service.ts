import { BaseService } from '../../core/service';
import { PromoCodeRepository } from './promo-code.repository';
import { HttpException } from '../../core/http-exception';

export type PromoDiscountType = 'PERCENT' | 'FIXED';

export class PromoCodeService extends BaseService {
    constructor(private promoCodeRepository: PromoCodeRepository) {
        super();
    }

    async list() {
        return this.promoCodeRepository.findMany();
    }

    async create(data: {
        code: string;
        description?: string;
        discount_type: PromoDiscountType;
        discount_value: number;
        start_date: string;
        end_date?: string | null;
        max_uses?: number | null;
        is_active?: boolean;
    }) {
        this.validatePromo(data);

        const code = data.code.trim().toUpperCase();
        const existing = await this.promoCodeRepository.findByCode(code);
        if (existing) {
            throw new HttpException(400, 'Promo code already exists');
        }

        return this.promoCodeRepository.create({
            code,
            description: data.description,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            start_date: new Date(data.start_date),
            end_date: data.end_date ? new Date(data.end_date) : null,
            max_uses: data.max_uses ?? null,
            is_active: data.is_active ?? true,
        });
    }

    async update(id: string, data: {
        code?: string;
        description?: string;
        discount_type?: PromoDiscountType;
        discount_value?: number;
        start_date?: string;
        end_date?: string | null;
        max_uses?: number | null;
        is_active?: boolean;
    }) {
        if (data.code) {
            data.code = data.code.trim().toUpperCase();
        }
        if (data.discount_type || data.discount_value || data.start_date || data.end_date !== undefined) {
            this.validatePromo({
                code: data.code || 'TEMP',
                description: data.description,
                discount_type: (data.discount_type || 'PERCENT') as PromoDiscountType,
                discount_value: data.discount_value || 1,
                start_date: data.start_date || new Date().toISOString(),
                end_date: data.end_date,
                max_uses: data.max_uses,
                is_active: data.is_active,
            });
        }

        return this.promoCodeRepository.update(id, {
            ...(data.code ? { code: data.code } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.discount_type ? { discount_type: data.discount_type } : {}),
            ...(data.discount_value !== undefined ? { discount_value: data.discount_value } : {}),
            ...(data.start_date ? { start_date: new Date(data.start_date) } : {}),
            ...(data.end_date !== undefined ? { end_date: data.end_date ? new Date(data.end_date) : null } : {}),
            ...(data.max_uses !== undefined ? { max_uses: data.max_uses } : {}),
            ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        });
    }

    private validatePromo(data: {
        code: string;
        description?: string;
        discount_type: PromoDiscountType;
        discount_value: number;
        start_date: string;
        end_date?: string | null;
        max_uses?: number | null;
        is_active?: boolean;
    }) {
        if (!data.code || data.code.trim().length < 3) {
            throw new HttpException(400, 'Promo code must be at least 3 characters');
        }
        if (!['PERCENT', 'FIXED'].includes(data.discount_type)) {
            throw new HttpException(400, 'Invalid discount type');
        }
        if (data.discount_value <= 0) {
            throw new HttpException(400, 'Discount value must be greater than zero');
        }
        if (data.discount_type === 'PERCENT' && data.discount_value > 100) {
            throw new HttpException(400, 'Percent discount cannot exceed 100');
        }
        if (!data.start_date) {
            throw new HttpException(400, 'Start date is required');
        }
        if (data.end_date) {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);
            if (end < start) {
                throw new HttpException(400, 'End date must be after start date');
            }
        }
        if (data.max_uses !== undefined && data.max_uses !== null && data.max_uses < 1) {
            throw new HttpException(400, 'Max uses must be at least 1');
        }
    }
}
