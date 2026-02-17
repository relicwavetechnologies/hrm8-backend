"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceRepository = void 0;
const prisma_1 = require("../../utils/prisma");
const date_fns_1 = require("date-fns");
class ComplianceRepository {
    async getOverduePayouts(thresholdDays) {
        const thresholdDate = (0, date_fns_1.subDays)(new Date(), thresholdDays);
        return prisma_1.prisma.settlement.findMany({
            where: {
                status: 'PENDING',
                generated_at: { lte: thresholdDate },
            },
            include: { licensee: true },
        });
    }
    async getInactiveRegions(thresholdDays) {
        // Get regions with licensees that have no recent placements
        // This logic is slightly complex for a repo method but fine for now
        const thresholdDate = (0, date_fns_1.subDays)(new Date(), thresholdDays);
        return prisma_1.prisma.region.findMany({
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
        return prisma_1.prisma.region.findMany({
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
    async getRegionalRevenue(regionId, startDate, endDate) {
        return prisma_1.prisma.regionalRevenue.aggregate({
            where: {
                region_id: regionId,
                period_start: { gte: startDate, lte: endDate },
            },
            _sum: { total_revenue: true },
        });
    }
    async getExpiredAgreements(thresholdDate) {
        return prisma_1.prisma.regionalLicensee.findMany({
            where: {
                status: 'ACTIVE',
                agreement_end_date: { lte: thresholdDate },
            },
        });
    }
}
exports.ComplianceRepository = ComplianceRepository;
