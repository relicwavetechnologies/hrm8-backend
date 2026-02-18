"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
class OverviewRepository {
    async getRegionMeta(regionId) {
        if (!regionId || regionId === 'all') {
            return { regionId: 'all', regionName: 'All Regions' };
        }
        const region = await prisma_1.prisma.region.findUnique({
            where: { id: regionId },
            select: { id: true, name: true }
        });
        return {
            regionId,
            regionName: region?.name || 'Unknown Region'
        };
    }
    async getQueueCounts(regionIds) {
        const regionWhere = regionIds && regionIds.length > 0 ? { in: regionIds } : undefined;
        const [pendingConversionRequests, pendingRefundRequests, pendingCareersRequests, pendingSettlements] = await Promise.all([
            prisma_1.prisma.leadConversionRequest.count({
                where: {
                    status: client_1.ConversionRequestStatus.PENDING,
                    ...(regionWhere ? { region_id: regionWhere } : {})
                }
            }),
            prisma_1.prisma.transactionRefundRequest.count({
                where: {
                    status: client_1.RefundStatus.PENDING,
                    ...(regionWhere ? { company: { region_id: regionWhere } } : {})
                }
            }),
            prisma_1.prisma.company.count({
                where: {
                    careers_page_status: 'PENDING',
                    ...(regionWhere ? { region_id: regionWhere } : {})
                }
            }),
            prisma_1.prisma.regionalRevenue.count({
                where: {
                    status: 'CONFIRMED',
                    ...(regionWhere ? { region_id: regionWhere } : {})
                }
            })
        ]);
        return {
            pendingConversionRequests,
            pendingRefundRequests,
            pendingCareersRequests,
            pendingSettlements
        };
    }
    async getFinance(regionIds) {
        const where = {
            status: 'PAID',
            ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {})
        };
        const [aggregate, paidSettlementCount] = await Promise.all([
            prisma_1.prisma.regionalRevenue.aggregate({
                where,
                _sum: {
                    total_revenue: true,
                    hrm8_share: true,
                    licensee_share: true
                }
            }),
            prisma_1.prisma.regionalRevenue.count({ where })
        ]);
        return {
            totalSettled: aggregate._sum.total_revenue || 0,
            hrm8Share: aggregate._sum.hrm8_share || 0,
            licenseeShare: aggregate._sum.licensee_share || 0,
            paidSettlementCount
        };
    }
    async getCapacityDistribution(regionIds) {
        const consultants = await prisma_1.prisma.consultant.findMany({
            where: {
                status: 'ACTIVE',
                ...(regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {})
            },
            select: {
                current_jobs: true,
                max_jobs: true
            }
        });
        let normal = 0;
        let warning = 0;
        let overloaded = 0;
        for (const consultant of consultants) {
            const maxCapacity = consultant.max_jobs || 10;
            const utilization = maxCapacity > 0 ? consultant.current_jobs / maxCapacity : 0;
            if (utilization >= 1)
                overloaded += 1;
            else if (utilization >= 0.8)
                warning += 1;
            else
                normal += 1;
        }
        return [
            { name: 'Normal', value: normal },
            { name: 'Warning', value: warning },
            { name: 'Overloaded', value: overloaded }
        ];
    }
    async getPipelineByStage(consultantIds) {
        if (consultantIds.length === 0)
            return [];
        const grouped = await prisma_1.prisma.opportunity.groupBy({
            by: ['stage'],
            where: {
                sales_agent_id: { in: consultantIds }
            },
            _count: { _all: true },
            _sum: { amount: true },
            _avg: { probability: true }
        });
        return grouped.map((entry) => {
            const amount = entry._sum.amount || 0;
            const probability = entry._avg.probability || 0;
            return {
                stage: entry.stage,
                count: entry._count._all,
                amount,
                weightedAmount: amount * (probability / 100)
            };
        });
    }
    async getSourceMixFromOverview(overviewBySource) {
        return Object.entries(overviewBySource || {}).map(([source, value]) => {
            const views = value.views || 0;
            const clicks = value.clicks || 0;
            return {
                source,
                views,
                clicks,
                ctr: views > 0 ? Number(((clicks / views) * 100).toFixed(1)) : 0
            };
        });
    }
    async getFunnel(overview) {
        return [
            {
                stage: 'Views',
                value: overview.total_views,
                conversionRate: 100
            },
            {
                stage: 'Clicks',
                value: overview.total_clicks,
                conversionRate: overview.conversion_rates.view_to_click || 0
            },
            {
                stage: 'Applications',
                value: overview.total_applications,
                conversionRate: overview.conversion_rates.view_to_apply || 0
            }
        ];
    }
}
exports.OverviewRepository = OverviewRepository;
