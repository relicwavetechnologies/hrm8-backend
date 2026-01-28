import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobService } from './job.service';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from '../application/application.repository';
import { AuthenticatedRequest } from '../../types';

import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { JobPaymentService } from './job-payment.service';

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
      const result = await this.jobService.getCompanyJobs(req.user.companyId, req.query);
      // Return full pagination object with jobs and total
      return this.sendSuccess(res, result);
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

  submitAndActivate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.submitAndActivate(id, req.user.companyId, req.user.id);
      return this.sendSuccess(res, job, 'Job submitted and activated successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createJobPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      // Process payment (wallet deduction)
      await JobPaymentService.processJobPayment(id, req.user.companyId, req.user.id);
      const job = await this.jobService.getJob(id, req.user.companyId);
      return this.sendSuccess(res, job, 'Payment processed successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateAlerts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.updateAlerts(id, req.user.companyId, req.body);
      return this.sendSuccess(res, job, 'Job alerts updated successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  generateDescription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.jobService.generateDescription(req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  inviteHiringTeamMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.inviteHiringTeamMember(id, req.user.companyId, req.user.id, req.body);
      return this.sendSuccess(res, job, 'Hiring team member invited successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };


  cloneJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.cloneJob(id, req.user.companyId, req.user.id);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  closeJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.closeJob(id, req.user.companyId, req.user.id);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  archiveJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.archiveJob(id, req.user.companyId, req.user.id);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  unarchiveJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.jobService.unarchiveJob(id, req.user.companyId);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getHiringTeam = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const team = await this.jobService.getHiringTeam(id, req.user.companyId);
      return this.sendSuccess(res, team);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  removeHiringTeamMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id, userId } = req.params as { id: string; userId: string };
      const job = await this.jobService.removeHiringTeamMember(id, req.user.companyId, userId); // userId here is actually email or something, checking service logic
      // Service expects memberEmail. The route usually passes 'userId' or 'email'. 
      // Let's assume the parameter passed is the identifier used in the list (email or id).
      // Based on service logic: removeHiringTeamMember(id, companyId, memberEmail).
      // So we need to ensure we pass the right thing. If the route is /:id/hiring-team/:userId, 
      // we might mean the email if that's how they are stored. 
      // Let's assume for now usage of email or we need to decode.
      // Actually service logic uses 'memberEmail'.
      // If frontend passes email directly: DELETE /:id/hiring-team/john@example.com
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobActivities = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const logs = await this.jobService.getJobActivities(id, req.user.companyId);
      return this.sendSuccess(res, logs);
    } catch (error) {
      return this.sendError(res, error);
    }
  };


  validateJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.jobService.validateJob(req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getDistributionChannels = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const channels = await this.jobService.getDistributionChannels(id, req.user.companyId);
      return this.sendSuccess(res, channels);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateDistributionChannels = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const { channels } = req.body; // Expecting { channels: [...] }
      const job = await this.jobService.updateDistributionChannels(id, req.user.companyId, channels);
      return this.sendSuccess(res, job);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
