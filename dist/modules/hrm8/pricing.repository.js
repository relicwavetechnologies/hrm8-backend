"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class PricingRepository {
    async findAllProducts() {
        return prisma_1.prisma.product.findMany({
            where: { is_active: true },
            include: { tiers: true },
        });
    }
    async upsertProduct(data) {
        if (data.id) {
            return prisma_1.prisma.product.update({
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
        return prisma_1.prisma.product.create({
            data: {
                name: data.name,
                code: data.code,
                description: data.description,
                category: data.category,
                is_active: data.isActive ?? true,
            },
        });
    }
    async deleteProduct(id) {
        return prisma_1.prisma.$transaction(async (tx) => {
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
    async findAllPriceBooks(filters) {
        const where = { is_active: true };
        if (filters.regionId) {
            where.region_id = filters.regionId;
        }
        if (filters.regionIds) {
            where.region_id = { in: filters.regionIds };
        }
        return prisma_1.prisma.priceBook.findMany({
            where,
            include: {
                tiers: {
                    include: { product: true }
                },
                region: true
            },
        });
    }
    async findPriceBookById(id) {
        return prisma_1.prisma.priceBook.findUnique({
            where: { id },
            include: {
                tiers: {
                    include: { product: true }
                },
                region: true
            }
        });
    }
    async createPriceBook(data) {
        return prisma_1.prisma.priceBook.create({
            data,
            include: { region: true }
        });
    }
    async updatePriceBook(id, data) {
        return prisma_1.prisma.priceBook.update({
            where: { id },
            data,
            include: { region: true }
        });
    }
    async deletePriceBook(id) {
        return prisma_1.prisma.priceBook.delete({
            where: { id }
        });
    }
    // Price Tiers
    async createTier(data) {
        return prisma_1.prisma.priceTier.create({
            data,
            include: { product: true }
        });
    }
    async updateTier(id, data) {
        return prisma_1.prisma.priceTier.update({
            where: { id },
            data,
            include: { product: true }
        });
    }
    async deleteTier(id) {
        return prisma_1.prisma.priceTier.delete({
            where: { id }
        });
    }
    // Promo Codes
    async findAllPromoCodes() {
        return prisma_1.prisma.promoCode.findMany({
            orderBy: { created_at: 'desc' }
        });
    }
    async findPromoCodeByCode(code) {
        return prisma_1.prisma.promoCode.findUnique({
            where: { code }
        });
    }
    async createPromoCode(data) {
        return prisma_1.prisma.promoCode.create({ data });
    }
    async updatePromoCode(id, data) {
        return prisma_1.prisma.promoCode.update({
            where: { id },
            data
        });
    }
    async deletePromoCode(id) {
        return prisma_1.prisma.promoCode.delete({
            where: { id }
        });
    }
}
exports.PricingRepository = PricingRepository;
