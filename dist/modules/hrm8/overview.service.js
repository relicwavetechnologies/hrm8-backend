"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const analytics_repository_1 = require("./analytics.repository");
const analytics_service_1 = require("./analytics.service");
const compliance_repository_1 = require("./compliance.repository");
const compliance_service_1 = require("./compliance.service");
const regional_sales_repository_1 = require("./regional-sales.repository");
const regional_sales_service_1 = require("./regional-sales.service");
const audit_log_repository_1 = require("./audit-log.repository");
const audit_log_service_1 = require("./audit-log.service");
class OverviewService extends service_1.BaseService {
    constructor(overviewRepository) {
        super();
        this.overviewRepository = overviewRepository;
        this.analyticsService = new analytics_service_1.AnalyticsService(new analytics_repository_1.AnalyticsRepository());
        this.complianceService = new compliance_service_1.ComplianceService(new compliance_repository_1.ComplianceRepository(), new audit_log_service_1.AuditLogService(new audit_log_repository_1.AuditLogRepository()));
        this.regionalSalesService = new regional_sales_service_1.RegionalSalesService(new regional_sales_repository_1.RegionalSalesRepository());
    }
    resolveScope(input) {
        const isGlobal = input.role === 'GLOBAL_ADMIN';
        const regionId = input.requestedRegionId || (isGlobal ? 'all' : (input.assignedRegionIds?.[0] || 'all'));
        if (!isGlobal) {
            if (!input.assignedRegionIds || input.assignedRegionIds.length === 0) {
                throw new http_exception_1.HttpException(403, 'No region access assigned');
            }
            if (regionId === 'all') {
                return {
                    isGlobal: false,
                    regionId: input.assignedRegionIds[0],
                    regionIds: input.assignedRegionIds
                };
            }
            if (!input.assignedRegionIds.includes(regionId)) {
                throw new http_exception_1.HttpException(403, 'Access denied to this region');
            }
            return {
                isGlobal: false,
                regionId,
                regionIds: [regionId]
            };
        }
        return {
            isGlobal: true,
            regionId,
            regionIds: regionId === 'all' ? undefined : [regionId]
        };
    }
    normalizePeriod(period) {
        if (period === '7d' || period === '30d' || period === '90d')
            return period;
        return '30d';
    }
    async getOverview(input) {
        const partialFailures = [];
        const period = this.normalizePeriod(input.period);
        const scope = this.resolveScope(input);
        const regionMeta = await this.overviewRepository.getRegionMeta(scope.regionId);
        if (input.summaryOnly) {
            const [operational, finance] = await Promise.all([
                this.analyticsService.getOperationalStats(scope.regionId, scope.isGlobal ? undefined : scope.regionIds, { includeTrends: false }),
                this.overviewRepository.getFinance(scope.regionIds)
            ]);
            return {
                scope: {
                    isGlobal: scope.isGlobal,
                    role: input.role,
                    regionId: regionMeta.regionId,
                    regionName: regionMeta.regionName
                },
                kpis: {
                    openJobs: operational.open_jobs_count,
                    unassignedJobs: Math.max(operational.open_jobs_count - operational.active_consultants_count, 0),
                    activeConsultants: operational.active_consultants_count,
                    placementsThisMonth: operational.placements_this_month,
                    activeEmployers: operational.active_employer_count,
                    newEmployers: operational.new_employer_count,
                    inactiveEmployers: operational.inactive_employer_count,
                    pipelineTotal: 0,
                    pipelineWeighted: 0,
                    deals: 0,
                    activeAgents: 0
                },
                charts: {
                    jobsTrend: [],
                    placementsTrend: [],
                    pipelineByStage: [],
                    funnel: [],
                    sourceMix: [],
                    capacityDistribution: [],
                    complianceSeverity: []
                },
                queues: {
                    pendingConversionRequests: 0,
                    pendingRefundRequests: 0,
                    pendingCareersRequests: 0,
                    pendingSettlements: 0
                },
                finance,
                meta: {
                    updatedAt: new Date().toISOString(),
                    period,
                    summaryOnly: true
                }
            };
        }
        const safe = async (section, fn, fallback) => {
            try {
                return await fn();
            }
            catch (error) {
                console.warn(`overview_section_failed:${section}`, {
                    error: error instanceof Error ? error.message : String(error)
                });
                partialFailures.push(section);
                return fallback;
            }
        };
        const operational = await safe('operational', async () => this.analyticsService.getOperationalStats(scope.regionId, scope.isGlobal ? undefined : scope.regionIds), {
            open_jobs_count: 0,
            active_consultants_count: 0,
            placements_this_month: 0,
            active_employer_count: 0,
            new_employer_count: 0,
            inactive_employer_count: 0,
            trends: { open_jobs: [], active_consultants: [], placements: [] }
        });
        const platformOverview = await safe('platformOverview', async () => this.analyticsService.getPlatformOverview({ regionId: scope.regionId === 'all' ? undefined : scope.regionId }), {
            total_jobs: 0,
            active_jobs: 0,
            total_companies: 0,
            total_views: 0,
            total_clicks: 0,
            total_applications: 0,
            conversion_rates: { view_to_click: 0, click_to_apply: 0, view_to_apply: 0 },
            by_source: {}
        });
        const [salesStats, consultants, queueCounts, finance, capacityDistribution, complianceSummary] = await Promise.all([
            safe('salesStats', async () => this.regionalSalesService.getStats(scope.regionId, scope.isGlobal ? undefined : scope.regionIds), { totalPipelineValue: 0, weightedPipelineValue: 0, dealCount: 0, activeAgents: 0 }),
            safe('regionalConsultants', async () => new regional_sales_repository_1.RegionalSalesRepository().findRegionalConsultants(scope.regionId, scope.isGlobal ? undefined : scope.regionIds), []),
            safe('queues', async () => this.overviewRepository.getQueueCounts(scope.regionIds), {
                pendingConversionRequests: 0,
                pendingRefundRequests: 0,
                pendingCareersRequests: 0,
                pendingSettlements: 0
            }),
            safe('finance', async () => this.overviewRepository.getFinance(scope.regionIds), { totalSettled: 0, hrm8Share: 0, licenseeShare: 0, paidSettlementCount: 0 }),
            safe('capacity', async () => this.overviewRepository.getCapacityDistribution(scope.regionIds), []),
            safe('compliance', async () => this.complianceService.getAlertSummary(), { critical: 0, high: 0, medium: 0, low: 0, total: 0, byType: {} })
        ]);
        const pipelineByStage = await safe('pipelineByStage', async () => this.overviewRepository.getPipelineByStage(consultants.map(c => c.id)), []);
        const funnel = await this.overviewRepository.getFunnel(platformOverview);
        const sourceMix = await this.overviewRepository.getSourceMixFromOverview(platformOverview.by_source);
        return {
            scope: {
                isGlobal: scope.isGlobal,
                role: input.role,
                regionId: regionMeta.regionId,
                regionName: regionMeta.regionName
            },
            kpis: {
                openJobs: operational.open_jobs_count,
                unassignedJobs: Math.max(operational.open_jobs_count - operational.active_consultants_count, 0),
                activeConsultants: operational.active_consultants_count,
                placementsThisMonth: operational.placements_this_month,
                activeEmployers: operational.active_employer_count,
                newEmployers: operational.new_employer_count,
                inactiveEmployers: operational.inactive_employer_count,
                pipelineTotal: salesStats.totalPipelineValue,
                pipelineWeighted: salesStats.weightedPipelineValue,
                deals: salesStats.dealCount,
                activeAgents: salesStats.activeAgents
            },
            charts: {
                jobsTrend: operational.trends.open_jobs,
                placementsTrend: operational.trends.placements,
                pipelineByStage,
                funnel,
                sourceMix,
                capacityDistribution,
                complianceSeverity: [
                    { severity: 'CRITICAL', value: complianceSummary.critical || 0 },
                    { severity: 'HIGH', value: complianceSummary.high || 0 },
                    { severity: 'MEDIUM', value: complianceSummary.medium || 0 },
                    { severity: 'LOW', value: complianceSummary.low || 0 }
                ]
            },
            queues: queueCounts,
            finance,
            meta: {
                updatedAt: new Date().toISOString(),
                period,
                summaryOnly: false,
                ...(partialFailures.length > 0 ? { partialFailures } : {})
            }
        };
    }
}
exports.OverviewService = OverviewService;
