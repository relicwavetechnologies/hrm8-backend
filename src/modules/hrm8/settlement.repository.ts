import { prisma } from '../../utils/prisma';

export class SettlementRepository {
    async findMany(filters: { regionId?: string; regionIds?: string[] }) {
        const where: any = {};
        if (filters.regionId) where.region_id = filters.regionId;
        if (filters.regionIds) where.region_id = { in: filters.regionIds };

        return prisma.regionalRevenue.findMany({
            where: {
                ...where,
                status: 'PAID'
            },
            include: {
                licensee: true,
                region: true
            },
            orderBy: { paid_at: 'desc' }
        });
    }

    async getStats(filters: { regionId?: string; regionIds?: string[] }) {
        const where: any = {};
        if (filters.regionId) where.region_id = filters.regionId;
        if (filters.regionIds) where.region_id = { in: filters.regionIds };

        const revenues = await prisma.regionalRevenue.findMany({
            where: { ...where, status: 'PAID' }
        });

        const totalSettled = revenues.reduce((sum, r) => sum + (r.total_revenue || 0), 0);
        const hrm8Share = revenues.reduce((sum, r) => sum + (r.hrm8_share || 0), 0);
        const licenseeShare = revenues.reduce((sum, r) => sum + (r.licensee_share || 0), 0);

        return {
            totalSettled,
            hrm8Share,
            licenseeShare,
            count: revenues.length
        };
    }
}
