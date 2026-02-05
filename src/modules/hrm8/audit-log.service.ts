import { BaseService } from '../../core/service';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLog } from '@prisma/client';

export interface CreateAuditLogInput {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    performedByEmail: string;
    performedByRole: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    description?: string;
}

export interface AuditLogEntry {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    performed_by: string;
    performed_by_email: string;
    performed_by_role: string;
    changes?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    description?: string;
    performed_at: Date;
}

export class AuditLogService extends BaseService {
    constructor(private auditLogRepository: AuditLogRepository) {
        super();
    }

    async log(input: CreateAuditLogInput): Promise<AuditLogEntry> {
        const entry = await this.auditLogRepository.create({
            entity_type: input.entityType,
            entity_id: input.entityId,
            action: input.action,
            performed_by: input.performedBy,
            performed_by_email: input.performedByEmail,
            performed_by_role: input.performedByRole,
            changes: (input.changes as any) || null,
            ip_address: input.ipAddress || null,
            user_agent: input.userAgent || null,
            description: input.description || null,
        });

        return this.mapToEntry(entry);
    }

    async getRecent(params: {
        entityType?: string;
        action?: string;
        actorId?: string;
        limit?: number;
        offset?: number;
    }) {
        const { logs, total } = await this.auditLogRepository.findRecent(params);
        return {
            logs: logs.map((log) => this.mapToEntry(log)),
            total,
        };
    }

    async getByEntity(entityType: string, entityId: string, limit?: number) {
        const logs = await this.auditLogRepository.findByEntity(entityType, entityId, limit);
        return logs.map((log) => this.mapToEntry(log));
    }

    async getStats() {
        const stats = await this.auditLogRepository.getStats();
        return {
            total_logs: stats.totalLogs,
            today_logs: stats.todayLogs,
            top_actions: stats.topActions,
        };
    }

    private mapToEntry(log: AuditLog): AuditLogEntry {
        return {
            id: log.id,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            action: log.action,
            performed_by: log.performed_by,
            performed_by_email: log.performed_by_email || 'unknown',
            performed_by_role: log.performed_by_role || 'SYSTEM',
            changes: log.changes as Record<string, unknown> | undefined,
            ip_address: log.ip_address || undefined,
            user_agent: log.user_agent || undefined,
            description: log.description || undefined,
            performed_at: log.performed_at,
        };
    }
}
