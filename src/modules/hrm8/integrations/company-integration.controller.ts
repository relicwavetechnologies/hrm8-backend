import { Response } from 'express';
import { BaseController } from '../../../core/controller';
import { Hrm8AuthenticatedRequest } from '../../../types';
import { prisma } from '../../../utils/prisma';
import { AuditLogService } from '../audit-log.service';
import { AuditLogRepository } from '../audit-log.repository';

export class CompanyIntegrationController extends BaseController {
  list = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { company_id } = req.params as { company_id: string };
      const integrations = await prisma.integration.findMany({
        where: { company_id },
        orderBy: { created_at: 'desc' },
      });
      return this.sendSuccess(res, { integrations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { company_id } = req.params as { company_id: string };
      const {
        type,
        name,
        status,
        api_key,
        api_secret,
        login_url,
        username,
        password,
        config,
      } = req.body;

      const integration = await prisma.integration.create({
        data: {
          company: { connect: { id: company_id } },
          type,
          name,
          status: status || 'ACTIVE',
          api_key,
          api_secret,
          login_url,
          username,
          password,
          config,
        },
      });

      const auditLogService = new AuditLogService(new AuditLogRepository());
      await auditLogService.log({
        entityType: 'company_integration',
        entityId: integration.id,
        action: 'CREATE',
        performedBy: req.hrm8User?.id || 'system',
        performedByEmail: req.hrm8User?.email || 'unknown',
        performedByRole: req.hrm8User?.role || 'SYSTEM',
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
        description: `Created company integration for ${company_id}`,
      });

      return this.sendSuccess(res, { integration });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { company_id, id } = req.params as { company_id: string; id: string };
      const {
        type,
        name,
        status,
        api_key,
        api_secret,
        login_url,
        username,
        password,
        config,
      } = req.body;

      const existing = await prisma.integration.findUnique({ where: { id } });
      if (!existing || existing.company_id !== company_id) {
        return this.sendError(res, new Error('Integration not found for company'));
      }

      const integration = await prisma.integration.update({
        where: { id },
        data: {
          company_id,
          type,
          name,
          status,
          api_key,
          api_secret,
          login_url,
          username,
          password,
          config,
        },
      });

      const auditLogService = new AuditLogService(new AuditLogRepository());
      await auditLogService.log({
        entityType: 'company_integration',
        entityId: integration.id,
        action: 'UPDATE',
        performedBy: req.hrm8User?.id || 'system',
        performedByEmail: req.hrm8User?.email || 'unknown',
        performedByRole: req.hrm8User?.role || 'SYSTEM',
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
        description: `Updated company integration for ${company_id}`,
      });

      return this.sendSuccess(res, { integration });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  remove = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      const existing = await prisma.integration.findUnique({ where: { id } });
      if (!existing) {
        return this.sendError(res, new Error('Integration not found'));
      }

      await prisma.integration.delete({ where: { id } });

      const auditLogService = new AuditLogService(new AuditLogRepository());
      await auditLogService.log({
        entityType: 'company_integration',
        entityId: id,
        action: 'DELETE',
        performedBy: req.hrm8User?.id || 'system',
        performedByEmail: req.hrm8User?.email || 'unknown',
        performedByRole: req.hrm8User?.role || 'SYSTEM',
        changes: { id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
        description: `Deleted company integration ${id}`,
      });

      return this.sendSuccess(res, { message: 'Integration removed' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
