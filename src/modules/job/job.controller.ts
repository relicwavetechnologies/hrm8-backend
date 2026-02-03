import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobService } from './job.service';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from '../application/application.repository';
import { AuthenticatedRequest } from '../../types';

import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { JobRoundService } from './job-round.service';
import { JobRoundRepository } from './job-round.repository';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentRepository } from '../assessment/assessment.repository';

export class JobController extends BaseController {
  private jobService: JobService;
  private jobRoundService: JobRoundService;
  private assessmentService: AssessmentService;

  constructor() {
    super();
    this.jobService = new JobService(
      new JobRepository(),
      new ApplicationRepository(),
      new NotificationService(new NotificationRepository())
    );
    this.jobRoundService = new JobRoundService(
      new JobRoundRepository(),
      new JobRepository()
    );
    this.assessmentService = new AssessmentService(
      new AssessmentRepository()
    );
  }

  createJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const job = await this.jobService.createJob(req.user.companyId, req.user.id, req.body);

      // Initialize rounds for new job
      await this.jobRoundService.initializeFixedRounds(job.id);

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
      console.error('[JobController] getJobs error:', error);
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
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveDraft = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };

      const job = await this.jobService.saveDraft(id, req.user.companyId, req.body);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };

      const job = await this.jobService.saveTemplate(id, req.user.companyId, req.body);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Job Round Methods

  getJobRounds = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      const result = await this.jobRoundService.getJobRounds(id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createJobRound = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      const result = await this.jobRoundService.createRound(id, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJobRound = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string, roundId: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      const result = await this.jobRoundService.updateRound(id, roundId, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteJobRound = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string, roundId: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      const result = await this.jobRoundService.deleteRound(id, roundId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Interview Configuration Methods

  getInterviewConfig = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string; roundId: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      const config = await this.jobRoundService.getInterviewConfig(roundId);
      return this.sendSuccess(res, { config: config || null });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  configureInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string; roundId: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      await this.jobRoundService.saveInterviewConfig(roundId, req.body);
      return this.sendSuccess(res, { message: 'Interview configuration saved successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Assessment Configuration Methods

  getAssessmentConfig = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string; roundId: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      const config = await this.jobRoundService.getAssessmentConfig(roundId);
      return this.sendSuccess(res, { config: config || null });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  configureAssessment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string; roundId: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      await this.jobRoundService.saveAssessmentConfig(roundId, req.body);
      return this.sendSuccess(res, { message: 'Assessment configuration saved successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRoundAssessments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string; roundId: string };
      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      const assessments = await this.assessmentService.getRoundAssessments(roundId);
      return this.sendSuccess(res, assessments);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  inviteHiringTeamMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const { email, name, role, permissions } = req.body;

      if (!email || !role) {
        return this.sendError(res, new Error('Email and role are required'), 400);
      }

      // Verify job access
      await this.jobService.getJob(id, req.user.companyId);

      await this.jobService.inviteTeamMember(id, req.user.companyId, { email, name, role, permissions });

      return this.sendSuccess(res, { message: 'Invitation sent successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
