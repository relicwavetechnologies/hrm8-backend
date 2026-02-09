import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { ComplianceRepository } from './compliance.repository';
import { ComplianceService } from './compliance.service';
import { RegionalSalesRepository } from './regional-sales.repository';
import { RegionalSalesService } from './regional-sales.service';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { OverviewPeriod, OverviewRepository } from './overview.repository';

type RequestScope = {
    role: string;
    requestedRegionId: string;
    assignedRegionIds?: string[];
};

export class OverviewService extends BaseService {
    private analyticsService: AnalyticsService;
    private complianceService: ComplianceService;
    private regionalSalesService: RegionalSalesService;

    constructor(private overviewRepository: OverviewRepository) {
        super();
        this.analyticsService = new AnalyticsService(new AnalyticsRepository());
        this.complianceService = new ComplianceService(new ComplianceRepository(), new AuditLogService(new AuditLogRepository()));
        this.regionalSalesService = new RegionalSalesService(new RegionalSalesRepository());
    }

    private resolveScope(input: RequestScope) {
        const isGlobal = input.role === 'GLOBAL_ADMIN';
        const regionId = input.requestedRegionId || (isGlobal ? 'all' : (input.assignedRegionIds?.[0] || 'all'));

        if (!isGlobal) {
            if (!input.assignedRegionIds || input.assignedRegionIds.length === 0) {
                throw new HttpException(403, 'No region access assigned');
            }
            if (regionId === 'all') {
                return {
                    isGlobal: false,
                    regionId: input.assignedRegionIds[0],
                    regionIds: input.assignedRegionIds
                };
            }
            if (!input.assignedRegionIds.includes(regionId)) {
                throw new HttpException(403, 'Access denied to this region');
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

    private normalizePeriod(period?: string): OverviewPeriod {
        if (period === '7d' || period === '30d' || period === '90d') return period;
        return '30d';
    }

    async getOverview(input: RequestScope & { period?: string }) {
        const partialFailures: string[] = [];
        const period = this.normalizePeriod(input.period);
        const scope = this.resolveScope(input);
        const regionMeta = await this.overviewRepository.getRegionMeta(scope.regionId);

        const safe = async <T>(section: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
            try {
                return await fn();
            } catch (error) {
                console.warn(`overview_section_failed:${section}`, {
                    error: error instanceof Error ? error.message : String(error)
                });
                partialFailures.push(section);
                return fallback;
            }
        };

        const operational = await safe(
            'operational',
            async () => this.analyticsService.getOperationalStats(scope.regionId, scope.isGlobal ? undefined : scope.regionIds),
            {
                open_jobs_count: 0,
                active_consultants_count: 0,
                placements_this_month: 0,
                active_employer_count: 0,
                new_employer_count: 0,
                inactive_employer_count: 0,
                trends: { open_jobs: [], active_consultants: [], placements: [] }
            }
        );

        const platformOverview = await safe(
            'platformOverview',
            async () => this.analyticsService.getPlatformOverview({ regionId: scope.regionId === 'all' ? undefined : scope.regionId }),
            {
                total_jobs: 0,
                active_jobs: 0,
                total_companies: 0,
                total_views: 0,
                total_clicks: 0,
                total_applications: 0,
                conversion_rates: { view_to_click: 0, click_to_apply: 0, view_to_apply: 0 },
                by_source: {}
            }
        );

        const [salesStats, consultants, queueCounts, finance, capacityDistribution, complianceSummary] = await Promise.all([
            safe(
                'salesStats',
                async () => this.regionalSalesService.getStats(scope.regionId, scope.isGlobal ? undefined : scope.regionIds),
                { totalPipelineValue: 0, weightedPipelineValue: 0, dealCount: 0, activeAgents: 0 }
            ),
            safe(
                'regionalConsultants',
                async () => new RegionalSalesRepository().findRegionalConsultants(scope.regionId, scope.isGlobal ? undefined : scope.regionIds),
                []
            ),
            safe(
                'queues',
                async () => this.overviewRepository.getQueueCounts(scope.regionIds),
                {
                    pendingConversionRequests: 0,
                    pendingRefundRequests: 0,
                    pendingCareersRequests: 0,
                    pendingSettlements: 0
                }
            ),
            safe(
                'finance',
                async () => this.overviewRepository.getFinance(scope.regionIds),
                { totalSettled: 0, hrm8Share: 0, licenseeShare: 0, paidSettlementCount: 0 }
            ),
            safe(
                'capacity',
                async () => this.overviewRepository.getCapacityDistribution(scope.regionIds),
                []
            ),
            safe(
                'compliance',
                async () => this.complianceService.getAlertSummary(),
                { critical: 0, high: 0, medium: 0, low: 0, total: 0, byType: {} }
            )
        ]);

        const pipelineByStage = await safe(
            'pipelineByStage',
            async () => this.overviewRepository.getPipelineByStage(consultants.map(c => c.id)),
            []
        );

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
                ...(partialFailures.length > 0 ? { partialFailures } : {})
            }
        };
    }
}
