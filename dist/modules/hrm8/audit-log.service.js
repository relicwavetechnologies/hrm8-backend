"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const service_1 = require("../../core/service");
class AuditLogService extends service_1.BaseService {
    constructor(auditLogRepository) {
        super();
        this.auditLogRepository = auditLogRepository;
    }
    async log(input) {
        const entry = await this.auditLogRepository.create({
            entity_type: input.entityType,
            entity_id: input.entityId,
            action: input.action,
            performed_by: input.performedBy,
            performed_by_email: input.performedByEmail,
            performed_by_role: input.performedByRole,
            changes: input.changes || null,
            ip_address: input.ipAddress || null,
            user_agent: input.userAgent || null,
            description: input.description || null,
        });
        return this.mapToEntry(entry);
    }
    async getRecent(params) {
        const { logs, total } = await this.auditLogRepository.findRecent(params);
        return {
            logs: logs.map((log) => this.mapToEntry(log)),
            total,
        };
    }
    async getByEntity(entityType, entityId, limit) {
        const logs = await this.auditLogRepository.findByEntity(entityType, entityId, limit);
        return logs.map((log) => this.mapToEntry(log));
    }
    async getStats() {
        return this.auditLogRepository.getStats();
    }
    mapToEntry(log) {
        return {
            id: log.id,
            entityType: log.entity_type,
            entityId: log.entity_id,
            action: log.action,
            performedBy: log.performed_by,
            performedByEmail: log.performed_by_email || 'unknown',
            performedByRole: log.performed_by_role || 'SYSTEM',
            changes: log.changes,
            ipAddress: log.ip_address || undefined,
            userAgent: log.user_agent || undefined,
            description: log.description || undefined,
            performedAt: log.performed_at,
        };
    }
}
exports.AuditLogService = AuditLogService;
