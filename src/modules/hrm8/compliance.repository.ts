import { prisma } from '../../utils/prisma';
import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export class ComplianceRepository {
    async getOverduePayouts(thresholdDays: number) {
        const thresholdDate = subDays(new Date(), thresholdDays);
        return prisma.settlement.findMany({
            where: {
                status: 'PENDING',
                generated_at: { lte: thresholdDate },
            },
            include: { licensee: true },
        });
    }

    async getInactiveRegions(thresholdDays: number) {
        // Get regions with licensees that have no recent placements
        // This logic is slightly complex for a repo method but fine for now
        const thresholdDate = subDays(new Date(), thresholdDays);
        return prisma.region.findMany({
            where: {
                is_active: true,
                licensee_id: { not: null },
            },
            select: {
                id: true,
                name: true,
                licensee: { select: { name: true } },
                commissions: {
                    where: {
                        type: 'PLACEMENT',
                        created_at: { gte: thresholdDate },
                    },
                    take: 1
                }
            },
        });
    }

    async getRegionsForRevenue() {
        // Just return regions relevant for revenue check
        return prisma.region.findMany({
            where: {
                is_active: true,
                licensee_id: { not: null },
            },
            select: {
                id: true,
                name: true,
                licensee: { select: { name: true } },
            },
        });
    }

    async getRegionalRevenue(regionId: string, startDate: Date, endDate: Date) {
        return prisma.regionalRevenue.aggregate({
            where: {
                region_id: regionId,
                period_start: { gte: startDate, lte: endDate },
            },
            _sum: { total_revenue: true },
        });
    }

    async getExpiredAgreements(thresholdDate: Date) {
        return prisma.regionalLicensee.findMany({
            where: {
                status: 'ACTIVE',
                agreement_end_date: { lte: thresholdDate },
            },
        });
    }
}
