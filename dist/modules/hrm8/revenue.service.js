"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
class RevenueService extends service_1.BaseService {
    constructor(revenueRepository) {
        super();
        this.revenueRepository = revenueRepository;
    }
    resolveDateRange(startDate, endDate) {
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const defaultEnd = now;
        const parsedStart = startDate ? new Date(startDate) : defaultStart;
        const parsedEnd = endDate ? new Date(endDate) : defaultEnd;
        const isStartValid = !isNaN(parsedStart.getTime());
        const isEndValid = !isNaN(parsedEnd.getTime());
        let start = isStartValid ? parsedStart : defaultStart;
        let end = isEndValid ? parsedEnd : defaultEnd;
        if (start > end) {
            const temp = start;
            start = end;
            end = temp;
        }
        return { start, end };
    }
    toMonthKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    mapToDTO(revenue) {
        return {
            id: revenue.id,
            region_id: revenue.region_id,
            licensee_id: revenue.licensee_id,
            period_start: revenue.period_start,
            period_end: revenue.period_end,
            total_revenue: revenue.total_revenue,
            licensee_share: revenue.licensee_share,
            hrm8_share: revenue.hrm8_share,
            status: revenue.status,
            payment_date: revenue.paid_at,
            paid_at: revenue.paid_at,
            created_at: revenue.created_at,
            updated_at: revenue.updated_at,
            region_name: revenue.region?.name,
            licensee_name: revenue.licensee?.name,
        };
    }
    async getAll(filters) {
        const revenues = await this.revenueRepository.findMany(filters);
        return {
            revenues: revenues.map(r => this.mapToDTO(r)),
            total: revenues.length
        };
    }
    async getById(id) {
        const revenue = await this.revenueRepository.findById(id);
        if (!revenue)
            throw new http_exception_1.HttpException(404, 'Revenue record not found');
        return revenue;
    }
    async confirm(id) {
        return this.revenueRepository.update(id, { status: 'CONFIRMED' });
    }
    async markAsPaid(id) {
        return this.revenueRepository.update(id, { status: 'PAID', paid_at: new Date() });
    }
    async getCompanyBreakdown(regionIds) {
        return this.revenueRepository.getCompanyRevenueBreakdown(regionIds);
    }
    async getDashboard(regionIds, startDate, endDate) {
        const { start, end } = this.resolveDateRange(startDate, endDate);
        const hasRegionFilter = Boolean(regionIds && regionIds.length > 0);
        const billWhere = {
            status: 'PAID',
            paid_at: { gte: start, lte: end },
            ...(hasRegionFilter ? {
                OR: [
                    { region_id: { in: regionIds } },
                    { company: { region_id: { in: regionIds } } },
                ],
            } : {}),
        };
        const commissionWhere = {
            status: { in: ['CONFIRMED', 'PAID'] },
            created_at: { gte: start, lte: end },
            ...(hasRegionFilter ? { region_id: { in: regionIds } } : {}),
        };
        const paidCommissionWhere = {
            status: 'PAID',
            paid_at: { gte: start, lte: end },
            ...(hasRegionFilter ? { region_id: { in: regionIds } } : {}),
        };
        const [revenueAgg, commissionAgg, paidCommissionCount, billRows, commissionsByRegion, consultantsByRegion, commissionsByTypeRaw, topCommissionsRaw, topConsultantsRaw, commissionsForTimeline,] = await Promise.all([
            prisma_1.prisma.bill.aggregate({
                where: billWhere,
                _sum: { total_amount: true },
                _count: { id: true },
            }),
            prisma_1.prisma.commission.aggregate({
                where: commissionWhere,
                _sum: { amount: true },
                _count: { id: true },
            }),
            prisma_1.prisma.commission.count({ where: paidCommissionWhere }),
            prisma_1.prisma.bill.findMany({
                where: billWhere,
                select: {
                    region_id: true,
                    total_amount: true,
                    paid_at: true,
                    company: {
                        select: { region_id: true },
                    },
                },
            }),
            prisma_1.prisma.commission.groupBy({
                by: ['region_id'],
                where: commissionWhere,
                _sum: { amount: true },
            }),
            prisma_1.prisma.consultant.groupBy({
                by: ['region_id'],
                where: hasRegionFilter ? { region_id: { in: regionIds } } : undefined,
                _count: { id: true },
            }),
            prisma_1.prisma.commission.groupBy({
                by: ['type'],
                where: commissionWhere,
                _sum: { amount: true },
                _count: { id: true },
            }),
            prisma_1.prisma.commission.groupBy({
                by: ['consultant_id', 'region_id'],
                where: commissionWhere,
                _sum: { amount: true },
                _count: { id: true },
                orderBy: { _sum: { amount: 'desc' } },
                take: 10,
            }),
            prisma_1.prisma.consultant.findMany({
                where: {
                    id: {
                        in: (await prisma_1.prisma.commission.groupBy({
                            by: ['consultant_id'],
                            where: commissionWhere,
                            _sum: { amount: true },
                            orderBy: { _sum: { amount: 'desc' } },
                            take: 10,
                        })).map((row) => row.consultant_id),
                    },
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                },
            }),
            prisma_1.prisma.commission.findMany({
                where: commissionWhere,
                select: { created_at: true, amount: true },
            }),
        ]);
        const totalRevenue = Number(revenueAgg._sum.total_amount || 0);
        const totalCommissions = Number(commissionAgg._sum.amount || 0);
        const netRevenue = totalRevenue - totalCommissions;
        const summary = {
            total_revenue: totalRevenue,
            total_commissions: totalCommissions,
            net_revenue: netRevenue,
            commission_rate: totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0,
            bill_count: revenueAgg._count.id || 0,
            paid_commission_count: paidCommissionCount,
        };
        const allRegionIds = new Set();
        billRows.forEach((row) => {
            const effectiveRegionId = row.region_id || row.company?.region_id;
            if (effectiveRegionId)
                allRegionIds.add(effectiveRegionId);
        });
        commissionsByRegion.forEach((row) => row.region_id && allRegionIds.add(row.region_id));
        consultantsByRegion.forEach((row) => row.region_id && allRegionIds.add(row.region_id));
        const regionIdsToLoad = Array.from(allRegionIds);
        const regionRows = regionIdsToLoad.length > 0
            ? await prisma_1.prisma.region.findMany({
                where: { id: { in: regionIdsToLoad } },
                select: { id: true, name: true },
            })
            : [];
        const regionNameMap = new Map(regionRows.map((row) => [row.id, row.name]));
        const revenueByRegionMap = new Map();
        billRows.forEach((row) => {
            const key = row.region_id || row.company?.region_id || 'unassigned';
            const existing = revenueByRegionMap.get(key) || { revenue: 0, bill_count: 0 };
            revenueByRegionMap.set(key, {
                revenue: existing.revenue + Number(row.total_amount || 0),
                bill_count: existing.bill_count + 1,
            });
        });
        const commissionsByRegionMap = new Map();
        commissionsByRegion.forEach((row) => {
            const key = row.region_id || 'unassigned';
            commissionsByRegionMap.set(key, Number(row._sum.amount || 0));
        });
        const consultantCountsByRegion = new Map();
        consultantsByRegion.forEach((row) => {
            consultantCountsByRegion.set(row.region_id, row._count.id || 0);
        });
        const mergedRegionKeys = new Set([
            ...Array.from(revenueByRegionMap.keys()),
            ...Array.from(commissionsByRegionMap.keys()),
            ...Array.from(consultantCountsByRegion.keys()),
        ]);
        const byRegion = Array.from(mergedRegionKeys).map((regionKey) => {
            const revenueMeta = revenueByRegionMap.get(regionKey);
            const commissions = commissionsByRegionMap.get(regionKey) || 0;
            const revenue = revenueMeta?.revenue || 0;
            const billCount = revenueMeta?.bill_count || 0;
            const consultantCount = consultantCountsByRegion.get(regionKey) || 0;
            const regionId = regionKey === 'unassigned' ? '' : regionKey;
            const regionName = regionKey === 'unassigned'
                ? 'Unassigned'
                : (regionNameMap.get(regionKey) || 'Unknown');
            return {
                region_id: regionId,
                region_name: regionName,
                revenue,
                commissions,
                net_revenue: revenue - commissions,
                bill_count: billCount,
                consultant_count: consultantCount,
            };
        }).sort((a, b) => b.revenue - a.revenue);
        const byCommissionType = commissionsByTypeRaw.map((row) => {
            const amount = Number(row._sum.amount || 0);
            return {
                type: row.type,
                amount,
                count: row._count.id || 0,
                percentage: totalCommissions > 0 ? (amount / totalCommissions) * 100 : 0,
            };
        }).sort((a, b) => b.amount - a.amount);
        const consultantNameMap = new Map(topConsultantsRaw.map((consultant) => [
            consultant.id,
            `${consultant.first_name || ''} ${consultant.last_name || ''}`.trim() || 'Unknown Consultant',
        ]));
        const topConsultants = topCommissionsRaw.map((row) => ({
            consultant_id: row.consultant_id,
            name: consultantNameMap.get(row.consultant_id) || 'Unknown Consultant',
            total_commissions: Number(row._sum.amount || 0),
            commission_count: row._count.id || 0,
            region_id: row.region_id,
            region_name: regionNameMap.get(row.region_id) || 'Unknown',
        }));
        const timelineMap = new Map();
        billRows.forEach((bill) => {
            if (!bill.paid_at)
                return;
            const key = this.toMonthKey(bill.paid_at);
            const current = timelineMap.get(key) || { revenue: 0, commissions: 0, bill_count: 0 };
            current.revenue += Number(bill.total_amount || 0);
            current.bill_count += 1;
            timelineMap.set(key, current);
        });
        commissionsForTimeline.forEach((commission) => {
            const key = this.toMonthKey(commission.created_at);
            const current = timelineMap.get(key) || { revenue: 0, commissions: 0, bill_count: 0 };
            current.commissions += Number(commission.amount || 0);
            timelineMap.set(key, current);
        });
        const timeline = [];
        const monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
        const monthEnd = new Date(end.getFullYear(), end.getMonth(), 1);
        const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
        while (monthCursor <= monthEnd) {
            const key = this.toMonthKey(monthCursor);
            const data = timelineMap.get(key) || { revenue: 0, commissions: 0, bill_count: 0 };
            timeline.push({
                month: monthFormatter.format(monthCursor),
                revenue: data.revenue,
                commissions: data.commissions,
                net_revenue: data.revenue - data.commissions,
                bill_count: data.bill_count,
            });
            monthCursor.setMonth(monthCursor.getMonth() + 1);
        }
        return {
            summary: {
                ...summary,
                totalRevenue: summary.total_revenue,
                totalCommissions: summary.total_commissions,
                netRevenue: summary.net_revenue,
                commissionRate: summary.commission_rate,
                billCount: summary.bill_count,
                paidCommissionCount: summary.paid_commission_count,
            },
            by_region: byRegion,
            byRegion: byRegion.map((entry) => ({
                ...entry,
                regionId: entry.region_id,
                regionName: entry.region_name,
                netRevenue: entry.net_revenue,
                billCount: entry.bill_count,
                consultantCount: entry.consultant_count,
            })),
            by_commission_type: byCommissionType,
            byCommissionType,
            top_consultants: topConsultants,
            topConsultants: topConsultants.map((entry) => ({
                ...entry,
                consultantId: entry.consultant_id,
                totalCommissions: entry.total_commissions,
                commissionCount: entry.commission_count,
                regionId: entry.region_id,
                regionName: entry.region_name,
            })),
            timeline: timeline.map((entry) => ({
                ...entry,
                netRevenue: entry.net_revenue,
                billCount: entry.bill_count,
            })),
        };
    }
    async getSummary(regionIds, startDate, endDate) {
        const dashboard = await this.getDashboard(regionIds, startDate, endDate);
        const summary = dashboard.summary;
        return {
            ...summary,
            totalRevenue: summary.total_revenue,
            totalCommissions: summary.total_commissions,
            netRevenue: summary.net_revenue,
            commissionRate: summary.commission_rate,
            billCount: summary.bill_count,
            paidCommissionCount: summary.paid_commission_count
        };
    }
}
exports.RevenueService = RevenueService;
