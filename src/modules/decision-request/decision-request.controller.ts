import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ConsultantDecisionRequestService } from '../consultant/consultant-decision-request.service';
import type { AuthenticatedRequest } from '../../types';

export class DecisionRequestController extends BaseController {
  listByJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const status = req.query.status as string | undefined;
      const companyId = req.user?.companyId;
      if (!companyId) return this.sendError(res, new Error('Unauthorized'), 401);

      const job = await this.verifyJobAccess(jobId, companyId);
      if (!job) return this.sendError(res, new Error('Job not found or access denied'), 404);

      const requests = await ConsultantDecisionRequestService.listByJob(
        jobId,
        status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined
      );
      return this.sendSuccess(res, { requests });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  listByCompany = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.params.companyId || req.user?.companyId;
      if (!companyId) return this.sendError(res, new Error('Company ID required'), 400);
      if (req.user?.companyId && req.user.companyId !== companyId && req.user.role !== 'ADMIN') {
        return this.sendError(res, new Error('Unauthorized'), 403);
      }

      const status = req.query.status as string | undefined;
      const requests = await ConsultantDecisionRequestService.listByCompany(
        companyId,
        status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined
      );
      return this.sendSuccess(res, { requests });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  approve = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;
      if (!userId || !companyId) return this.sendError(res, new Error('Unauthorized'), 401);

      const hasAccess = await ConsultantDecisionRequestService.verifyHrAccess(id, companyId);
      if (!hasAccess) return this.sendError(res, new Error('Access denied'), 403);

      const result = await ConsultantDecisionRequestService.approve(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  reject = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;
      if (!userId || !companyId) return this.sendError(res, new Error('Unauthorized'), 401);

      const hasAccess = await ConsultantDecisionRequestService.verifyHrAccess(id, companyId);
      if (!hasAccess) return this.sendError(res, new Error('Access denied'), 403);

      const result = await ConsultantDecisionRequestService.reject(id, userId, rejectionReason || '');
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;
      if (!companyId) return this.sendError(res, new Error('Unauthorized'), 401);

      const request = await ConsultantDecisionRequestService.getById(id);
      if (!request) return this.sendError(res, new Error('Request not found'), 404);

      const hasAccess = await ConsultantDecisionRequestService.verifyHrAccess(id, companyId);
      if (!hasAccess) return this.sendError(res, new Error('Access denied'), 403);

      return this.sendSuccess(res, { request });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  private async verifyJobAccess(jobId: string, companyId: string) {
    const { prisma } = await import('../../utils/prisma');
    return prisma.job.findFirst({
      where: { id: jobId, company_id: companyId },
      select: { id: true },
    });
  }
}
