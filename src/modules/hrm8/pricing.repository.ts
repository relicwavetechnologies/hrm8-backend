import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

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
                    category: data.category,
                    is_active: data.isActive,
                },
            });
        }
        return prisma.product.create({
            data: {
                name: data.name,
                code: data.code,
                description: data.description,
                category: data.category,
                is_active: data.isActive ?? true,
            },
        });
    }

    async upsertPriceBook(data: {
        id?: string;
        name: string;
        description?: string;
        isGlobal?: boolean;
        regionId?: string | null;
        currency?: string;
        isActive?: boolean;
    }) {
        if (data.id) {
            return prisma.priceBook.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    description: data.description,
                    is_global: data.isGlobal,
                    region_id: data.regionId,
                    currency: data.currency,
                    is_active: data.isActive,
                },
                include: {
                    tiers: { include: { product: true } },
                    region: true
                },
            });
        }
        return prisma.priceBook.create({
            data: {
                name: data.name,
                description: data.description,
                is_global: data.isGlobal ?? false,
                region_id: data.regionId ?? null,
                currency: data.currency || 'USD',
                is_active: data.isActive ?? true,
            },
            include: {
                tiers: { include: { product: true } },
                region: true
            },
        });
    }

    async upsertPriceTier(data: {
        id?: string;
        priceBookId: string;
        productId: string;
        name: string;
        minQuantity?: number;
        maxQuantity?: number | null;
        unitPrice: number;
        period?: string;
    }) {
        if (data.id) {
            return prisma.priceTier.update({
                where: { id: data.id },
                data: {
                    price_book_id: data.priceBookId,
                    product_id: data.productId,
                    name: data.name,
                    min_quantity: data.minQuantity ?? 1,
                    max_quantity: data.maxQuantity ?? null,
                    unit_price: data.unitPrice,
                    period: data.period || 'MONTHLY',
                },
                include: { product: true, price_book: true },
            });
        }
        return prisma.priceTier.create({
            data: {
                price_book: { connect: { id: data.priceBookId } },
                product: { connect: { id: data.productId } },
                name: data.name,
                min_quantity: data.minQuantity ?? 1,
                max_quantity: data.maxQuantity ?? null,
                unit_price: data.unitPrice,
                period: data.period || 'MONTHLY',
            },
            include: { product: true, price_book: true },
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
}
