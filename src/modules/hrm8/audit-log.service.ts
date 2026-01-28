import { BaseService } from '../../core/service';
import { Prisma } from '@prisma/client';

export class AuditLogService extends BaseService {
    constructor() {
        super();
    }

    async getAuditLogs(params: {
        page?: number;
        limit?: number;
        entityType?: string;
        entityId?: string;
        performedBy?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const { page = 1, limit = 20, entityType, entityId, performedBy, startDate, endDate } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.AuditLogWhereInput = {};

        if (entityType) where.entity_type = entityType;
        if (entityId) where.entity_id = entityId;
        if (performedBy) where.performed_by = performedBy;

        if (startDate || endDate) {
            where.performed_at = {};
            if (startDate) where.performed_at.gte = new Date(startDate);
            if (endDate) where.performed_at.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { performed_at: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getAuditLogStats() {
        // Get counts by entity type
        const byType = await this.prisma.auditLog.groupBy({
            by: ['entity_type'],
            _count: { id: true },
        });

        // Get activity over last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentActivity = await this.prisma.auditLog.count({
            where: {
                performed_at: { gte: thirtyDaysAgo },
            },
        });

        return {
            byType: byType.reduce((acc, curr) => {
                acc[curr.entity_type] = curr._count.id;
                return acc;
            }, {} as Record<string, number>),
            recentActivity,
        };
    }

    async getEntityAuditLogs(entityType: string, entityId: string) {
        return this.prisma.auditLog.findMany({
            where: {
                entity_type: entityType,
                entity_id: entityId,
            },
            orderBy: { performed_at: 'desc' },
        });
    }
}
