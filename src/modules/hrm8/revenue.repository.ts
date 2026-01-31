import { prisma } from '../../utils/prisma';
import { Prisma, RevenueStatus } from '@prisma/client';

export class RevenueRepository {
    async findMany(filters: {
        regionId?: string;
        regionIds?: string[];
        licenseeId?: string;
        status?: RevenueStatus;
    }) {
        const where: any = {};
        if (filters.regionId) where.region_id = filters.regionId;
        if (filters.regionIds) where.region_id = { in: filters.regionIds };
        if (filters.licenseeId) where.licensee_id = filters.licenseeId;
        if (filters.status) where.status = filters.status;

        return prisma.regionalRevenue.findMany({
            where,
            include: {
                region: true,
                licensee: true
            },
            orderBy: { period_start: 'desc' }
        });
    }

    async findById(id: string) {
        return prisma.regionalRevenue.findUnique({
            where: { id },
            include: { region: true, licensee: true }
        });
    }

    async update(id: string, data: any) {
        return prisma.regionalRevenue.update({ where: { id }, data });
    }

    async getCompanyRevenueBreakdown(regionIds?: string[]) {
        // In legacy, this was a complex raw SQL or aggregate.
        // For template, we'll return a simplified list.
        return prisma.company.findMany({
            where: { region_id: { in: regionIds } },
            select: {
                id: true,
                name: true,
                _count: { select: { jobs: true } }
            }
        });
    }
}
