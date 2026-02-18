"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsOverviewService = void 0;
const service_1 = require("../../core/service");
const prisma_1 = require("../../utils/prisma");
class SettingsOverviewService extends service_1.BaseService {
    async getOverview() {
        // Run queries in parallel
        const [activeIntegrationsCount, totalIntegrationsCount, failedSyncIntegrationsCount, auditLogsToday, recentAuditLogs] = await Promise.all([
            // Active integrations
            prisma_1.prisma.integration.count({
                where: { status: 'ACTIVE' }
            }),
            // Total integrations
            prisma_1.prisma.integration.count(),
            // Failed syncs (mock logic based on status or error message)
            prisma_1.prisma.integration.count({
                where: {
                    OR: [
                        { status: 'ERROR' },
                        { error_message: { not: null } }
                    ]
                }
            }),
            // Audit logs today
            prisma_1.prisma.auditLog.count({
                where: {
                    performed_at: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            // Recent audit logs
            prisma_1.prisma.auditLog.findMany({
                take: 5,
                orderBy: { performed_at: 'desc' },
                select: {
                    id: true,
                    action: true,
                    entity_type: true,
                    performed_by_email: true,
                    performed_at: true,
                    description: true
                }
            })
        ]);
        // Mock service status checks (in a real app, these would check actual connectivity)
        const services = {
            api: 'online',
            database: 'online',
            redis: 'online' // assuming redis is connected if app is running
        };
        // Determine overall system health
        let health = 'healthy';
        if (failedSyncIntegrationsCount > 5)
            health = 'degraded';
        if (services.database === 'offline')
            health = 'critical';
        return {
            system: {
                health,
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            },
            integrations: {
                total: totalIntegrationsCount,
                active: activeIntegrationsCount,
                failed: failedSyncIntegrationsCount,
                syncStatus: {
                    success: activeIntegrationsCount - failedSyncIntegrationsCount,
                    failed: failedSyncIntegrationsCount,
                    in_progress: 0 // placeholder
                }
            },
            auditLogs: {
                todayCount: auditLogsToday,
                recentEvents: recentAuditLogs.map(log => ({
                    ...log,
                    status: log.description?.toLowerCase().includes('failed') ? 'failed' : 'success'
                }))
            },
            pendingActions: {
                emailTemplates: 0, // Placeholder
                integrationSyncs: failedSyncIntegrationsCount,
                systemAlerts: failedSyncIntegrationsCount > 0 ? 1 : 0
            },
            services
        };
    }
}
exports.SettingsOverviewService = SettingsOverviewService;
