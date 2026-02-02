import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export class AdminRepository {
    // ==================== CATEGORIES ====================

    async getAllCategories(includeInactive = false) {
        const where: Prisma.JobCategoryWhereInput = includeInactive
            ? {}
            : { is_active: true };

        return prisma.jobCategory.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }

    async getCategoryById(id: string) {
        return prisma.jobCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }

    async getCategoryBySlug(slug: string) {
        return prisma.jobCategory.findUnique({
            where: { slug }
        });
    }

    async getCategoryBySlugExcluding(slug: string, excludeId: string) {
        return prisma.jobCategory.findFirst({
            where: {
                slug,
                id: { not: excludeId }
            }
        });
    }

    async createCategory(data: Prisma.JobCategoryCreateInput) {
        return prisma.jobCategory.create({ data });
    }

    async updateCategory(id: string, data: Prisma.JobCategoryUpdateInput) {
        return prisma.jobCategory.update({
            where: { id },
            data
        });
    }

    async deleteCategory(id: string) {
        return prisma.jobCategory.delete({
            where: { id }
        });
    }

    async reorderCategories(newOrder: { id: string; order: number }[]) {
        return prisma.$transaction(
            newOrder.map(({ id, order }) =>
                prisma.jobCategory.update({
                    where: { id },
                    data: { order }
                })
            )
        );
    }

    // ==================== TAGS ====================

    async getAllTags(includeInactive = false) {
        const where: Prisma.JobTagWhereInput = includeInactive
            ? {}
            : { is_active: true };

        return prisma.jobTag.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }

    async getTagById(id: string) {
        return prisma.jobTag.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }

    async getTagBySlug(slug: string) {
        return prisma.jobTag.findUnique({
            where: { slug }
        });
    }

    async getTagBySlugExcluding(slug: string, excludeId: string) {
        return prisma.jobTag.findFirst({
            where: {
                slug,
                id: { not: excludeId }
            }
        });
    }

    async createTag(data: Prisma.JobTagCreateInput) {
        return prisma.jobTag.create({ data });
    }

    async updateTag(id: string, data: Prisma.JobTagUpdateInput) {
        return prisma.jobTag.update({
            where: { id },
            data
        });
    }

    async deleteTag(id: string) {
        // Delete all assignments first
        await prisma.jobTagAssignment.deleteMany({
            where: { tag_id: id }
        });

        return prisma.jobTag.delete({
            where: { id }
        });
    }
}
