import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateAuthenticatedRequest } from '../../types';
import { CandidateJobService } from './candidate-job.service';

export class CandidateJobsController extends BaseController {
  private jobService: CandidateJobService;

  constructor() {
    super();
    this.jobService = new CandidateJobService();
  }

  listJobs = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { skip = '0', take = '20' } = req.query;
      const jobs = await this.jobService.listJobs(parseInt(skip as string), parseInt(take as string));
      return this.sendSuccess(res, { jobs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const job = await this.jobService.getJobDetails(jobId);
      if (!job) return this.sendError(res, new Error('Job not found'), 404);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  applyJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const application = await this.jobService.applyToJob(req.candidate.id, jobId, req.body);
      res.status(201);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const saved = await this.jobService.saveJob(req.candidate.id, jobId);
      return this.sendSuccess(res, { saved });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  searchJobs = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { q = '', location = '', employmentType = '', skip = '0', take = '20' } = req.query;
      const jobs = await this.jobService.searchJobs(
        q as string,
        location as string,
        employmentType as string,
        parseInt(skip as string),
        parseInt(take as string)
      );
      return this.sendSuccess(res, { jobs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRecommendedJobs = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recommendedJobs = await this.jobService.getRecommendedJobs(req.candidate.id, limit);
      return this.sendSuccess(res, recommendedJobs);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
