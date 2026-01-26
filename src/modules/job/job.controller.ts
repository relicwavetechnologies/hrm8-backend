import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobService } from './job.service';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from '../application/application.repository';
import { AuthenticatedRequest } from '../../types';

import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';

export class JobController extends BaseController {
  private jobService: JobService;

  constructor() {
    super();
    this.jobService = new JobService(
      new JobRepository(),
      new ApplicationRepository(),
      new NotificationService(new NotificationRepository())
    );
  }

  createJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const job = await this.jobService.createJob(req.user.companyId, req.user.id, req.body);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const jobs = await this.jobService.getCompanyJobs(req.user.companyId, req.query);
      return this.sendSuccess(res, { jobs });
    } catch (error) {
      console.error('[JobController] getJobs error:', error);
      return this.sendError(res, error);
    }
  };

  getJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.getJob(id, req.user.companyId);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.updateJob(id, req.user.companyId, req.body);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.jobService.deleteJob(id, req.user.companyId);
      return this.sendSuccess(res, { message: 'Job deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  bulkDeleteJobs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { jobIds } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return this.sendError(res, new Error('Job IDs array is required'), 400);
      }

      const deletedCount = await this.jobService.bulkDeleteJobs(jobIds, req.user.companyId);
      return this.sendSuccess(res, {
        deletedCount,
        message: `${deletedCount} job(s) deleted successfully`
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  publishJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };

      const job = await this.jobService.publishJob(id, req.user.companyId, req.user.id);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveDraft = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.saveDraft(id, req.user.companyId, req.body);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.saveTemplate(id, req.user.companyId, req.body);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
