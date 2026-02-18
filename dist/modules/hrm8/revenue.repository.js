"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueRepository = void 0;
const prisma_1 = require("../../utils/prisma");
const client_1 = require("@prisma/client");
class RevenueRepository {
    async findMany(filters) {
        const where = {};
        if (filters.regionId)
            where.region_id = filters.regionId;
        if (filters.regionIds)
            where.region_id = { in: filters.regionIds };
        if (filters.licenseeId)
            where.licensee_id = filters.licenseeId;
        if (filters.status)
            where.status = filters.status;
        return prisma_1.prisma.regionalRevenue.findMany({
            where,
            include: {
                region: true,
                licensee: true
            },
            orderBy: { period_start: 'desc' }
        });
    }
    async findById(id) {
        return prisma_1.prisma.regionalRevenue.findUnique({
            where: { id },
            include: { region: true, licensee: true }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.regionalRevenue.update({ where: { id }, data });
    }
    async getCompanyRevenueBreakdown(regionIds) {
        const where = {};
        if (regionIds && regionIds.length > 0) {
            where.region_id = { in: regionIds };
        }
        const companies = await prisma_1.prisma.company.findMany({
            where,
            select: {
                id: true,
                name: true,
                region_id: true,
                bill: {
                    where: { status: client_1.BillStatus.PAID },
                    select: {
                        amount: true,
                        total_amount: true,
                        subscription_id: true,
                        paid_at: true,
                    },
                },
                _count: { select: { jobs: true } },
            },
        });
        return companies.map((company) => {
            const jobRevenue = company.bill.reduce((sum, bill) => {
                if (bill.subscription_id)
                    return sum;
                return sum + Number(bill.total_amount ?? bill.amount ?? 0);
            }, 0);
            const subscriptionRevenue = company.bill.reduce((sum, bill) => {
                if (!bill.subscription_id)
                    return sum;
                return sum + Number(bill.total_amount ?? bill.amount ?? 0);
            }, 0);
            const totalRevenue = jobRevenue + subscriptionRevenue;
            const hrm8Share = totalRevenue * 0.3;
            const licenseeShare = totalRevenue - hrm8Share;
            const paidTimestamps = company.bill
                .map((bill) => bill.paid_at?.getTime() ?? 0)
                .filter((timestamp) => timestamp > 0);
            const lastPaymentAt = paidTimestamps.length > 0
                ? new Date(Math.max(...paidTimestamps)).toISOString()
                : null;
            return {
                id: company.id,
                name: company.name,
                region_id: company.region_id,
                job_revenue: jobRevenue,
                subscription_revenue: subscriptionRevenue,
                total_revenue: totalRevenue,
                licensee_share: licenseeShare,
                hrm8_share: hrm8Share,
                active_jobs: company._count.jobs,
                last_payment_at: lastPaymentAt,
            };
        });
    }
}
exports.RevenueRepository = RevenueRepository;
