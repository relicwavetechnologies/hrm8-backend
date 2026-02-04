import { Response } from 'express';
import { IntegrationAdminService } from './integration-admin.service';
import { AuditLogService } from '../audit-log.service';
import { AuditLogRepository } from '../audit-log.repository';
import { Hrm8AuthenticatedRequest } from '../../../types';

export class IntegrationAdminController {
  static async getAll(_: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const integrations = await IntegrationAdminService.getAll();
      res.json({ success: true, data: { integrations } });
    } catch (error) {
      console.error('Get integrations error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
    }
  }

  static async upsert(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const payload = req.body || {};
      const integration = await IntegrationAdminService.upsert({
        provider: payload.provider,
        name: payload.name,
        category: payload.category,
        api_key: payload.api_key,
        api_secret: payload.api_secret,
        endpoint_url: payload.endpoint_url,
        config: payload.config,
        is_active: payload.is_active,
      });

      const auditLogService = new AuditLogService(new AuditLogRepository());
      await auditLogService.log({
        entityType: 'global_integration',
        entityId: integration.id,
        action: 'UPSERT',
        performedBy: req.hrm8User?.id || 'system',
        performedByEmail: req.hrm8User?.email || 'unknown',
        performedByRole: req.hrm8User?.role || 'SYSTEM',
        changes: payload,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
        description: `Upserted global integration ${integration.provider}`,
      });

      res.json({ success: true, data: { integration } });
    } catch (error) {
      console.error('Upsert integration error:', error);
      res.status(500).json({ success: false, error: 'Failed to upsert integration' });
    }
  }

  static async getUsage(_: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const usage = await IntegrationAdminService.getUsageStats();
      res.json({ success: true, data: { usage } });
    } catch (error) {
      console.error('Get usage error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch usage stats' });
    }
  }
}
