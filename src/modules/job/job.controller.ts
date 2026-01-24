import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobService } from './job.service';
import { JobRepository } from './job.repository';
import { AuthenticatedRequest } from '../../types';

export class JobController extends BaseController {
  private jobService: JobService;

  constructor() {
    super();
    this.jobService = new JobService(new JobRepository());
  }

  createJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const job = await this.jobService.createJob(req.user.companyId, req.user.id, req.body);
      return this.sendSuccess(res, { job });
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
      return this.sendError(res, error);
    }
  };

  getJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.getJob(id, req.user.companyId);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.updateJob(id, req.user.companyId, req.body);
      return this.sendSuccess(res, { job });
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
}
