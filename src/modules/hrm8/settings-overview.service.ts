import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';

export interface SystemOverviewResponse {
    system: {
        health: 'healthy' | 'degraded' | 'critical';
        uptime: number; // in seconds
        version: string;
        environment: string;
    };
    integrations: {
        total: number;
        active: number;
        failed: number;
        syncStatus: {
            success: number;
            failed: number;
            in_progress: number;
        };
    };
    auditLogs: {
        todayCount: number;
        recentEvents: Array<{
            id: string;
            action: string;
            entity_type: string;
            performed_by_email: string | null;
            performed_at: Date;
            status: 'success' | 'failed'; // derived from description or action
        }>;
    };
    pendingActions: {
        emailTemplates: number; // templates needing review (mock for now)
        integrationSyncs: number; // failed syncs
        systemAlerts: number; // critical issues
    };
    services: {
        api: 'online' | 'offline';
        database: 'online' | 'offline';
        redis: 'online' | 'offline';
    };
}

export class SettingsOverviewService extends BaseService {
    async getOverview(): Promise<SystemOverviewResponse> {
        // Run queries in parallel
        const [
            activeIntegrationsCount,
            totalIntegrationsCount,
            failedSyncIntegrationsCount,
            auditLogsToday,
            recentAuditLogs
        ] = await Promise.all([
            // Active integrations
            prisma.integration.count({
                where: { status: 'ACTIVE' }
            }),
            // Total integrations
            prisma.integration.count(),
            // Failed syncs (mock logic based on status or error message)
            prisma.integration.count({
                where: {
                    OR: [
                        { status: 'ERROR' },
                        { error_message: { not: null } }
                    ]
                }
            }),
            // Audit logs today
            prisma.auditLog.count({
                where: {
                    performed_at: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            // Recent audit logs
            prisma.auditLog.findMany({
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
            api: 'online' as 'online' | 'offline',
            database: 'online' as 'online' | 'offline',
            redis: 'online' as 'online' | 'offline' // assuming redis is connected if app is running
        };

        // Determine overall system health
        let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
        if (failedSyncIntegrationsCount > 5) health = 'degraded';
        if (services.database === 'offline') health = 'critical';

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
