import { prisma } from '../../utils/prisma';

export class SettlementRepository {
    async findMany(filters: { regionId?: string; regionIds?: string[]; status?: string }) {
        const where: any = {};
        if (filters.regionId) where.region_id = filters.regionId;
        if (filters.regionIds) where.region_id = { in: filters.regionIds };
        if (filters.status && filters.status !== 'all') {
            where.status = filters.status;
        }

        return prisma.regionalRevenue.findMany({
            where: {
                ...where,
                // If no status filter, default logic? Or just return all?
                // Previously it was PAID only. Let's return all unless filtered.
                // But let's check if 'settlements' usually means only PENDING/PAID.
                // Revenue has statuses: PENDING, CONFIRMED, PAID.
                // Settlements likely refers to CONFIRMED or PAID items for payout.
                // PENDING usually means revenue not yet confirmed.
                // I will filter out PENDING? Or let frontend decide.
                // Frontend defaults filter to 'all'.
                status: filters.status && filters.status !== 'all' ? filters.status : { in: ['CONFIRMED', 'PAID'] }
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

    async update(id: string, data: any) {
        return prisma.regionalRevenue.update({
            where: { id },
            data
        });
    }

    async create(data: any) {
        return prisma.settlement.create({
            data
        });
    }
}
