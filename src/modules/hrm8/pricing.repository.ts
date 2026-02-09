import { prisma } from '../../utils/prisma';
import { Prisma, ProductCategory } from '@prisma/client';

export class PricingRepository {
    async findAllProducts() {
        return prisma.product.findMany({
            where: { is_active: true },
            include: { tiers: true },
        });
    }

    async upsertProduct(data: {
        id?: string;
        name: string;
        code: string;
        description?: string;
        category: string;
        isActive?: boolean;
    }) {
        if (data.id) {
            return prisma.product.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    code: data.code,
                    description: data.description,
                    category: data.category as ProductCategory,
                    is_active: data.isActive,
                },
            });
        }
        return prisma.product.create({
            data: {
                name: data.name,
                code: data.code,
                description: data.description,
                category: data.category as ProductCategory,
                is_active: data.isActive ?? true,
            },
        });
    }

    async deleteProduct(id: string) {
        return prisma.$transaction(async (tx) => {
            // Delete related price tiers first
            await tx.priceTier.deleteMany({
                where: { product_id: id },
            });

            // Delete the product
            return tx.product.delete({
                where: { id },
            });
        });
    }

    async findAllPriceBooks(filters: { regionId?: string; regionIds?: string[] }) {
        const where: any = { is_active: true };
        if (filters.regionId) {
            where.region_id = filters.regionId;
        }
        if (filters.regionIds) {
            where.region_id = { in: filters.regionIds };
        }
        return prisma.priceBook.findMany({
            where,
            include: {
                tiers: {
                    include: { product: true }
                },
                region: true
            },
        });
    }

    async findPriceBookById(id: string) {
        return prisma.priceBook.findUnique({
            where: { id },
            include: {
                tiers: {
                    include: { product: true }
                },
                region: true
            }
        });
    }

    async createPriceBook(data: Prisma.PriceBookCreateInput) {
        return prisma.priceBook.create({
            data,
            include: { region: true }
        });
    }

    async updatePriceBook(id: string, data: Prisma.PriceBookUpdateInput) {
        return prisma.priceBook.update({
            where: { id },
            data,
            include: { region: true }
        });
    }

    async deletePriceBook(id: string) {
        return prisma.priceBook.delete({
            where: { id }
        });
    }

    // Price Tiers
    async createTier(data: Prisma.PriceTierCreateInput) {
        return prisma.priceTier.create({
            data,
            include: { product: true }
        });
    }

    async updateTier(id: string, data: Prisma.PriceTierUpdateInput) {
        return prisma.priceTier.update({
            where: { id },
            data,
            include: { product: true }
        });
    }

    async deleteTier(id: string) {
        return prisma.priceTier.delete({
            where: { id }
        });
    }

    // Promo Codes
    async findAllPromoCodes() {
        return prisma.promoCode.findMany({
            orderBy: { created_at: 'desc' }
        });
    }

    async findPromoCodeByCode(code: string) {
        return prisma.promoCode.findUnique({
            where: { code }
        });
    }

    async createPromoCode(data: Prisma.PromoCodeCreateInput) {
        return prisma.promoCode.create({ data });
    }

    async updatePromoCode(id: string, data: Prisma.PromoCodeUpdateInput) {
        return prisma.promoCode.update({
            where: { id },
            data
        });
    }

    async deletePromoCode(id: string) {
        return prisma.promoCode.delete({
            where: { id }
        });
    }
}
