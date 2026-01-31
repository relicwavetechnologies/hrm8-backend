import { PrismaClient, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class AuditLogRepository {
    async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
        return prisma.auditLog.create({ data });
    }

    async findByEntity(
        entityType: string,
        entityId: string,
        limit: number = 50
    ): Promise<AuditLog[]> {
        return prisma.auditLog.findMany({
            where: {
                entity_type: entityType,
                entity_id: entityId,
            },
            orderBy: { performed_at: 'desc' },
            take: limit,
        });
    }

    async findByActor(actorId: string, limit: number = 50): Promise<AuditLog[]> {
        return prisma.auditLog.findMany({
            where: { performed_by: actorId },
            orderBy: { performed_at: 'desc' },
            take: limit,
        });
    }

    async findRecent(params: {
        entityType?: string;
        action?: string;
        actorId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ logs: AuditLog[]; total: number }> {
        const { entityType, action, actorId, limit = 50, offset = 0 } = params;
        const where: Prisma.AuditLogWhereInput = {};

        if (entityType) where.entity_type = entityType;
        if (action) where.action = action;
        if (actorId) where.performed_by = actorId;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { performed_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { logs, total };
    }

    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalLogs, todayLogs, actionCounts] = await Promise.all([
            prisma.auditLog.count(),
            prisma.auditLog.count({
                where: { performed_at: { gte: today } },
            }),
            prisma.auditLog.groupBy({
                by: ['action'],
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 5,
            }),
        ]);

        return {
            totalLogs,
            todayLogs,
            topActions: actionCounts.map((a: any) => ({
                action: a.action,
                count: a._count.action,
            })),
        };
    }
}
