"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class AuditLogRepository {
    async create(data) {
        return prisma_1.prisma.auditLog.create({ data });
    }
    async findByEntity(entityType, entityId, limit = 50) {
        return prisma_1.prisma.auditLog.findMany({
            where: {
                entity_type: entityType,
                entity_id: entityId,
            },
            orderBy: { performed_at: 'desc' },
            take: limit,
        });
    }
    async findByActor(actorId, limit = 50) {
        return prisma_1.prisma.auditLog.findMany({
            where: { performed_by: actorId },
            orderBy: { performed_at: 'desc' },
            take: limit,
        });
    }
    async findRecent(params) {
        const { entityType, action, actorId, limit = 50, offset = 0 } = params;
        const where = {};
        if (entityType)
            where.entity_type = entityType;
        if (action)
            where.action = action;
        if (actorId)
            where.performed_by = actorId;
        const [logs, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { performed_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma_1.prisma.auditLog.count({ where }),
        ]);
        return { logs, total };
    }
    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalLogs, todayLogs, actionCounts] = await Promise.all([
            prisma_1.prisma.auditLog.count(),
            prisma_1.prisma.auditLog.count({
                where: { performed_at: { gte: today } },
            }),
            prisma_1.prisma.auditLog.groupBy({
                by: ['action'],
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 5,
            }),
        ]);
        return {
            totalLogs,
            todayLogs,
            topActions: actionCounts.map((a) => ({
                action: a.action,
                count: a._count.action,
            })),
        };
    }
}
exports.AuditLogRepository = AuditLogRepository;
