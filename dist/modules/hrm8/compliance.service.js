"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceService = void 0;
const service_1 = require("../../core/service");
const date_fns_1 = require("date-fns");
class ComplianceService extends service_1.BaseService {
    constructor(complianceRepository, auditLogService) {
        super();
        this.complianceRepository = complianceRepository;
        this.auditLogService = auditLogService;
    }
    async getAllAlerts() {
        const alerts = [];
        // Check for overdue payouts
        const overduePayouts = await this.getOverduePayouts(30);
        alerts.push(...overduePayouts);
        // Check for inactive regions
        const inactiveRegions = await this.getInactiveRegions(60);
        alerts.push(...inactiveRegions);
        // Check for revenue declines
        const revenueDeclines = await this.getRevenueDeclines(20);
        alerts.push(...revenueDeclines);
        // Check for expired agreements
        const expiredAgreements = await this.getExpiredAgreements();
        alerts.push(...expiredAgreements);
        // Sort by severity
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        return alerts;
    }
    async getOverduePayouts(thresholdDays = 30) {
        const settlements = await this.complianceRepository.getOverduePayouts(thresholdDays);
        return settlements.map((settlement) => {
            const daysOverdue = Math.floor((new Date().getTime() - settlement.generated_at.getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: `overdue-${settlement.id}`,
                type: 'OVERDUE_PAYOUT',
                severity: daysOverdue > 60 ? 'CRITICAL' : daysOverdue > 45 ? 'HIGH' : 'MEDIUM',
                entityType: 'LICENSEE',
                entityId: settlement.licensee_id,
                entityName: settlement.licensee?.name || 'Unknown',
                title: 'Overdue Payout',
                description: `Settlement of $${settlement.licensee_share.toLocaleString()} is ${daysOverdue} days overdue`,
                value: settlement.licensee_share,
                threshold: thresholdDays,
                detectedAt: new Date(),
            };
        });
    }
    async getInactiveRegions(thresholdDays = 60) {
        const regions = await this.complianceRepository.getInactiveRegions(thresholdDays);
        const alerts = [];
        for (const region of regions) {
            // Repo already filtered strictly or we do post-check?
            // Repo returns regions with commissions. Assuming we need to check if commissions is empty.
            // In getInactiveRegions repo method, I did `commissions: { take: 1 }`.
            // If array is empty, then no placements in X days.
            if (!region.commissions || region.commissions.length === 0) {
                alerts.push({
                    id: `inactive-${region.id}`,
                    type: 'INACTIVE_REGION',
                    severity: 'MEDIUM',
                    entityType: 'REGION',
                    entityId: region.id,
                    entityName: region.name,
                    title: 'Inactive Region',
                    description: `No placements in the last ${thresholdDays} days`,
                    value: 0,
                    threshold: thresholdDays,
                    detectedAt: new Date(),
                });
            }
        }
        return alerts;
    }
    async getRevenueDeclines(thresholdPercent = 20) {
        const now = new Date();
        const lastMonth = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 1));
        const lastMonthEnd = (0, date_fns_1.endOfMonth)((0, date_fns_1.subMonths)(now, 1));
        const twoMonthsAgo = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 2));
        const twoMonthsAgoEnd = (0, date_fns_1.endOfMonth)((0, date_fns_1.subMonths)(now, 2));
        const regions = await this.complianceRepository.getRegionsForRevenue();
        const alerts = [];
        for (const region of regions) {
            const [lastMonthData, twoMonthsAgoData] = await Promise.all([
                this.complianceRepository.getRegionalRevenue(region.id, lastMonth, lastMonthEnd),
                this.complianceRepository.getRegionalRevenue(region.id, twoMonthsAgo, twoMonthsAgoEnd)
            ]);
            const current = lastMonthData._sum.total_revenue || 0;
            const previous = twoMonthsAgoData._sum.total_revenue || 0;
            if (previous > 0) {
                const declinePercent = ((previous - current) / previous) * 100;
                if (declinePercent >= thresholdPercent) {
                    alerts.push({
                        id: `decline-${region.id}`,
                        type: 'REVENUE_DECLINE',
                        severity: declinePercent > 40 ? 'HIGH' : 'MEDIUM',
                        entityType: 'REGION',
                        entityId: region.id,
                        entityName: region.name,
                        title: 'Revenue Decline',
                        description: `Revenue dropped ${declinePercent.toFixed(1)}% from $${previous.toLocaleString()} to $${current.toLocaleString()}`,
                        value: declinePercent,
                        threshold: thresholdPercent,
                        detectedAt: new Date(),
                    });
                }
            }
        }
        return alerts;
    }
    async getExpiredAgreements() {
        const now = new Date();
        const thirtyDaysFromNow = (0, date_fns_1.subDays)(now, -30);
        const licensees = await this.complianceRepository.getExpiredAgreements(thirtyDaysFromNow);
        return licensees.map((licensee) => {
            const isExpired = licensee.agreement_end_date && licensee.agreement_end_date < now;
            const daysUntil = licensee.agreement_end_date
                ? Math.floor((licensee.agreement_end_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            return {
                id: `agreement-${licensee.id}`,
                type: 'EXPIRED_AGREEMENT',
                severity: isExpired ? 'CRITICAL' : daysUntil < 7 ? 'HIGH' : 'MEDIUM',
                entityType: 'LICENSEE',
                entityId: licensee.id,
                entityName: licensee.name,
                title: isExpired ? 'Agreement Expired' : 'Agreement Expiring Soon',
                description: isExpired
                    ? `Agreement expired ${Math.abs(daysUntil)} days ago`
                    : `Agreement expires in ${daysUntil} days`,
                detectedAt: new Date(),
            };
        });
    }
    async getAlertSummary() {
        const alerts = await this.getAllAlerts();
        const summary = {
            total: alerts.length,
            critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
            high: alerts.filter((a) => a.severity === 'HIGH').length,
            medium: alerts.filter((a) => a.severity === 'MEDIUM').length,
            low: alerts.filter((a) => a.severity === 'LOW').length,
            byType: {},
        };
        alerts.forEach((alert) => {
            summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;
        });
        return summary;
    }
    async getAuditHistory(entityType, entityId, limit) {
        return this.auditLogService.getByEntity(entityType, entityId, limit);
    }
    async getRecentAudit(limit) {
        return this.auditLogService.getRecent({ limit });
    }
}
exports.ComplianceService = ComplianceService;
