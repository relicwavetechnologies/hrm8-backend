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
