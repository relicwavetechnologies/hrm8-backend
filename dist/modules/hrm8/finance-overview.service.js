"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceOverviewService = void 0;
const service_1 = require("../../core/service");
const prisma_1 = require("../../utils/prisma");
class FinanceOverviewService extends service_1.BaseService {
    /**
     * Get comprehensive finance overview for the specified period and regions
     */
    async getOverview(regionIds) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        // Build where clause for regional filtering
        const regionFilter = regionIds && regionIds.length > 0
            ? { region_id: { in: regionIds } }
            : {};
        // Run all queries in parallel for performance
        const [
        // Current period revenue
        currentRevenue, previousRevenue, 
        // Current period commissions
        currentCommissions, previousCommissions, 
        // Commission breakdown by type
        recruitmentCommissions, salesCommissions, 
        // Withdrawals
        completedWithdrawals, pendingWithdrawalsData, 
        // Refunds
        completedRefunds, pendingRefundsData, 
        // Settlements
        completedSettlements, pendingSettlementsData, 
        // Revenue by source (bills)
        subscriptionRevenueData, placementRevenueData,] = await Promise.all([
            // Total revenue for current month
            prisma_1.prisma.bill.aggregate({
                where: {
                    status: 'PAID',
                    paid_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                },
                _sum: { amount: true },
            }),
            // Previous month revenue for growth calculation
            prisma_1.prisma.bill.aggregate({
                where: {
                    status: 'PAID',
                    paid_at: { gte: startOfPrevMonth, lte: endOfPrevMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                },
                _sum: { amount: true },
            }),
            // Current month commissions
            prisma_1.prisma.commission.aggregate({
                where: {
                    status: { in: ['CONFIRMED', 'PAID'] },
                    confirmed_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                },
                _sum: { amount: true },
            }),
            // Previous month commissions
            prisma_1.prisma.commission.aggregate({
                where: {
                    status: { in: ['CONFIRMED', 'PAID'] },
                    confirmed_at: { gte: startOfPrevMonth, lte: endOfPrevMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                },
                _sum: { amount: true },
            }),
            // Commission by type - Recruitment (using PLACEMENT as the commission type for recruitment)
            prisma_1.prisma.commission.aggregate({
                where: {
                    type: 'PLACEMENT',
                    status: { in: ['CONFIRMED', 'PAID'] },
                    confirmed_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                },
                _sum: { amount: true },
            }),
            // Commission by type - Sales (using SUBSCRIPTION_SALE as a proxy for sales commissions)
            prisma_1.prisma.commission.aggregate({
                where: {
                    type: 'SUBSCRIPTION_SALE',
                    status: { in: ['CONFIRMED', 'PAID'] },
                    confirmed_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                },
                _sum: { amount: true },
            }),
            // Completed withdrawals (current month)
            prisma_1.prisma.commissionWithdrawal.aggregate({
                where: {
                    status: 'COMPLETED',
                    processed_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { consultant: { region_id: { in: regionIds } } } : {}),
                },
                _sum: { amount: true },
            }),
            // Pending withdrawals
            prisma_1.prisma.commissionWithdrawal.aggregate({
                where: {
                    status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
                    ...(regionIds && regionIds.length > 0 ? { consultant: { region_id: { in: regionIds } } } : {}),
                },
                _sum: { amount: true },
                _count: true,
            }),
            // Completed refunds (current month)
            prisma_1.prisma.transactionRefundRequest.aggregate({
                where: {
                    status: 'COMPLETED',
                    refund_completed_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { company: { region_id: { in: regionIds } } } : {}),
                },
                _sum: { amount: true },
            }),
            // Pending refunds
            prisma_1.prisma.transactionRefundRequest.aggregate({
                where: {
                    status: 'PENDING',
                    ...(regionIds && regionIds.length > 0 ? { company: { region_id: { in: regionIds } } } : {}),
                },
                _sum: { amount: true },
                _count: true,
            }),
            // Completed settlements (current month)
            prisma_1.prisma.settlement.aggregate({
                where: {
                    status: 'PAID',
                    payment_date: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { licensee: { regions: { some: { id: { in: regionIds } } } } } : {}),
                },
                _sum: { total_revenue: true }, // Using total_revenue as the settlement metric
            }),
            // Pending settlements
            prisma_1.prisma.settlement.aggregate({
                where: {
                    status: { in: ['PENDING', 'APPROVED'] },
                    ...(regionIds && regionIds.length > 0 ? { licensee: { regions: { some: { id: { in: regionIds } } } } } : {}),
                },
                _sum: { total_revenue: true },
                _count: true,
            }),
            // Revenue by source - Subscriptions (linked to subscription)
            prisma_1.prisma.bill.aggregate({
                where: {
                    status: 'PAID',
                    paid_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                    subscription_id: { not: null },
                },
                _sum: { amount: true },
            }),
            // Revenue by source - Placements (manual/one-time bills)
            prisma_1.prisma.bill.aggregate({
                where: {
                    status: 'PAID',
                    paid_at: { gte: startOfMonth, lte: endOfMonth },
                    ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {}),
                    subscription_id: null,
                },
                _sum: { amount: true },
            }),
        ]);
        // Calculate totals
        const totalRevenue = Number(currentRevenue._sum.amount || 0);
        const totalCommissions = Number(currentCommissions._sum.amount || 0);
        const totalWithdrawals = Number(completedWithdrawals._sum.amount || 0);
        const totalRefunds = Number(completedRefunds._sum.amount || 0);
        const totalSettlements = Number(completedSettlements._sum.total_revenue || 0);
        // Calculate growth percentages
        const prevRevenue = Number(previousRevenue._sum.amount || 0);
        const prevCommissions = Number(previousCommissions._sum.amount || 0);
        const revenueGrowth = prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
            : 0;
        const commissionsGrowth = prevCommissions > 0
            ? ((totalCommissions - prevCommissions) / prevCommissions) * 100
            : 0;
        // Revenue by source
        const subscriptions = Number(subscriptionRevenueData._sum.amount || 0);
        const placements = Number(placementRevenueData._sum.amount || 0);
        const other = totalRevenue - subscriptions - placements;
        // Commission by type
        const recruitment = Number(recruitmentCommissions._sum.amount || 0);
        const sales = Number(salesCommissions._sum.amount || 0);
        // Net cash flow
        const totalPayouts = totalCommissions + totalWithdrawals + totalRefunds + totalSettlements;
        const netCashFlow = totalRevenue - totalPayouts;
        // Projected payouts (pending items)
        const projectedPayouts = Number(pendingWithdrawalsData._sum.amount || 0) +
            Number(pendingRefundsData._sum.amount || 0) +
            Number(pendingSettlementsData._sum.total_revenue || 0);
        return {
            totalRevenue,
            totalCommissions,
            totalWithdrawals,
            totalRefunds,
            totalSettlements,
            revenueGrowth,
            commissionsGrowth,
            pendingWithdrawals: {
                count: pendingWithdrawalsData._count || 0,
                totalAmount: Number(pendingWithdrawalsData._sum.amount || 0),
            },
            pendingRefunds: {
                count: pendingRefundsData._count || 0,
                totalAmount: Number(pendingRefundsData._sum.amount || 0),
            },
            pendingSettlements: {
                count: pendingSettlementsData._count || 0,
                totalAmount: Number(pendingSettlementsData._sum.total_revenue || 0),
            },
            revenueBySource: {
                subscriptions,
                placements,
                other: other > 0 ? other : 0,
            },
            commissionsByType: {
                recruitment,
                sales,
            },
            netCashFlow,
            projectedPayouts,
            period: {
                start: startOfMonth.toISOString(),
                end: endOfMonth.toISOString(),
            },
        };
    }
}
exports.FinanceOverviewService = FinanceOverviewService;
