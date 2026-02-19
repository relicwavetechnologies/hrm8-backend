"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class AdminRepository {
    // ==================== CATEGORIES ====================
    async getAllCategories(includeInactive = false) {
        const where = includeInactive
            ? {}
            : { is_active: true };
        return prisma_1.prisma.jobCategory.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }
    async getCategoryById(id) {
        return prisma_1.prisma.jobCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }
    async getCategoryBySlug(slug) {
        return prisma_1.prisma.jobCategory.findUnique({
            where: { slug }
        });
    }
    async getCategoryBySlugExcluding(slug, excludeId) {
        return prisma_1.prisma.jobCategory.findFirst({
            where: {
                slug,
                id: { not: excludeId }
            }
        });
    }
    async createCategory(data) {
        return prisma_1.prisma.jobCategory.create({ data });
    }
    async updateCategory(id, data) {
        return prisma_1.prisma.jobCategory.update({
            where: { id },
            data
        });
    }
    async deleteCategory(id) {
        return prisma_1.prisma.jobCategory.delete({
            where: { id }
        });
    }
    async reorderCategories(newOrder) {
        return prisma_1.prisma.$transaction(newOrder.map(({ id, order }) => prisma_1.prisma.jobCategory.update({
            where: { id },
            data: { order }
        })));
    }
    // ==================== TAGS ====================
    async getAllTags(includeInactive = false) {
        const where = includeInactive
            ? {}
            : { is_active: true };
        return prisma_1.prisma.jobTag.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }
    async getTagById(id) {
        return prisma_1.prisma.jobTag.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }
    async getTagBySlug(slug) {
        return prisma_1.prisma.jobTag.findUnique({
            where: { slug }
        });
    }
    async getTagBySlugExcluding(slug, excludeId) {
        return prisma_1.prisma.jobTag.findFirst({
            where: {
                slug,
                id: { not: excludeId }
            }
        });
    }
    async createTag(data) {
        return prisma_1.prisma.jobTag.create({ data });
    }
    async updateTag(id, data) {
        return prisma_1.prisma.jobTag.update({
            where: { id },
            data
        });
    }
    async deleteTag(id) {
        // Delete all assignments first
        await prisma_1.prisma.jobTagAssignment.deleteMany({
            where: { tag_id: id }
        });
        return prisma_1.prisma.jobTag.delete({
            where: { id }
        });
    }
}
exports.AdminRepository = AdminRepository;
