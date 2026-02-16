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
import { jobDescriptionGeneratorService } from '../ai/job-description-generator.service';

export class JobController extends BaseController {
  private jobService: JobService;
  private jobRoundService: JobRoundService;
  private assessmentService: AssessmentService;

  constructor() {
    super();
    this.jobRoundService = new JobRoundService(
      new JobRoundRepository(),
      new JobRepository()
    );
    this.jobService = new JobService(
      new JobRepository(),
      new ApplicationRepository(),
      new NotificationService(new NotificationRepository()),
      this.jobRoundService
    );
    this.assessmentService = new AssessmentService(
      new AssessmentRepository()
    );
  }

  createJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const job = await this.jobService.createJob(req.user.companyId, req.user.id, req.body);

      // Initialize rounds for new job based on setup type
      if (job.setup_type === 'SIMPLE' || (req.body.setupType && req.body.setupType.toLowerCase() === 'simple')) {
        await this.jobRoundService.initializeSimpleRounds(job.id);
      } else {
        await this.jobRoundService.initializeFixedRounds(job.id);
      }

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

      const { templateName, templateDescription } = req.body;
      if (!templateName) {
        return this.sendError(res, new Error('Template name is required'), 400);
      }
      const job = await this.jobService.saveAsTemplate(id, req.user.companyId, templateName, templateDescription);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Submit and activate a job (final step of job wizard)
   * POST /api/jobs/:id/submit
   */
  submitAndActivate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const { paymentId } = req.body;

      const job = await this.jobService.submitAndActivate(id, req.user.companyId, req.user.id, paymentId);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Update job alerts configuration
   * PUT /api/jobs/:id/alerts
   */
  updateAlerts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };

      const job = await this.jobService.updateAlerts(id, req.user.companyId, req.body);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Save job as a named template
   * POST /api/jobs/:id/save-as-template
   */
  saveAsTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const { templateName, templateDescription } = req.body;

      if (!templateName) {
        return this.sendError(res, new Error('Template name is required'), 400);
      }


      const result = await this.jobService.saveAsTemplate(id, req.user.companyId, templateName, templateDescription);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Archive a job
   * POST /api/jobs/:id/archive
   */
  archiveJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };

      const job = await this.jobService.archiveJob(id, req.user.companyId, req.user.id);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Unarchive a job
   * POST /api/jobs/:id/unarchive
   */
  unarchiveJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };

      const job = await this.jobService.unarchiveJob(id, req.user.companyId);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Bulk archive jobs
   * POST /api/jobs/bulk-archive
   */
  bulkArchiveJobs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { jobIds } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return this.sendError(res, new Error('Job IDs array is required'), 400);
      }

      const archivedCount = await this.jobService.bulkArchiveJobs(jobIds, req.user.companyId, req.user.id);
      return this.sendSuccess(res, {
        archivedCount,
        message: `${archivedCount} job(s) archived successfully`
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Bulk unarchive jobs
   * POST /api/jobs/bulk-unarchive
   */
  bulkUnarchiveJobs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { jobIds } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return this.sendError(res, new Error('Job IDs array is required'), 400);
      }

      const unarchivedCount = await this.jobService.bulkUnarchiveJobs(jobIds, req.user.companyId);
      return this.sendSuccess(res, {
        unarchivedCount,
        message: `${unarchivedCount} job(s) unarchived successfully`
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Job Round Methods

  getJobRounds = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);

      const result = await this.jobRoundService.getJobRounds(resolvedJobId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createJobRound = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);

      const result = await this.jobRoundService.createRound(resolvedJobId, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJobRound = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string, roundId: string };
      const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);

      const result = await this.jobRoundService.updateRound(resolvedJobId, roundId, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteJobRound = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, roundId } = req.params as { id: string, roundId: string };
      const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);

      const result = await this.jobRoundService.deleteRound(resolvedJobId, roundId);
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
      await this.jobService.resolveJobId(id, req.user.companyId);

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
      await this.jobService.resolveJobId(id, req.user.companyId);

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
      await this.jobService.resolveJobId(id, req.user.companyId);

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
      await this.jobService.resolveJobId(id, req.user.companyId);

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
      await this.jobService.resolveJobId(id, req.user.companyId);

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

      await this.jobService.inviteTeamMember(id, req.user.companyId, {
        email,
        name,
        role,
        permissions,
        roles: req.body.roles,
        inviterId: req.user.id,
      });

      return this.sendSuccess(res, { message: 'Invitation sent successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobRoles = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
      const roles = await this.jobService.getJobRoles(resolvedJobId, req.user.companyId);
      return this.sendSuccess(res, { roles });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createJobRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
      const role = await this.jobService.createJobRole(resolvedJobId, req.user.companyId, req.body);
      return this.sendSuccess(res, { role });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getHiringTeam = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };

      const members = await this.jobService.getTeamMembers(id, req.user.companyId);
      return this.sendSuccess(res, members);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateHiringTeamMemberRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, memberId } = req.params as { id: string; memberId: string };
      const { role, roles: roleIds } = req.body;

      if (Array.isArray(roleIds)) {
        await this.jobService.updateTeamMemberRoles(id, memberId, req.user.companyId, roleIds);
      } else if (role != null) {
        await this.jobService.updateTeamMemberRole(id, memberId, req.user.companyId, role);
      } else {
        return this.sendError(res, new Error('role or roles is required'), 400);
      }
      return this.sendSuccess(res, { message: 'Role updated successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  removeHiringTeamMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, memberId } = req.params as { id: string; memberId: string };

      await this.jobService.removeTeamMember(id, memberId, req.user.companyId);
      return this.sendSuccess(res, { message: 'Member removed successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  resendHiringTeamInvite = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, memberId } = req.params as { id: string; memberId: string };

      await this.jobService.resendInvite(id, memberId, req.user.companyId, req.user.id);
      return this.sendSuccess(res, { message: 'Invitation resent successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Generate job description using AI
   * POST /api/jobs/generate-description
   */
  generateDescription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));

      const requestData = req.body;
      if (!requestData.title) {
        return this.sendError(res, new Error('Job title is required'), 400);
      }

      const generated = await jobDescriptionGeneratorService.generateWithAI(requestData);
      return this.sendSuccess(res, generated);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
