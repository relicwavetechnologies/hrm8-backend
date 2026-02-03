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
    performedAt: Date;
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
        return this.auditLogRepository.getStats();
    }

    private mapToEntry(log: AuditLog): AuditLogEntry {
        return {
            id: log.id,
            entityType: log.entity_type,
            entityId: log.entity_id,
            action: log.action,
            performedBy: log.performed_by,
            performedByEmail: log.performed_by_email || 'unknown',
            performedByRole: log.performed_by_role || 'SYSTEM',
            changes: log.changes as Record<string, unknown> | undefined,
            ipAddress: log.ip_address || undefined,
            userAgent: log.user_agent || undefined,
            description: log.description || undefined,
            performedAt: log.performed_at,
        };
    }
}
