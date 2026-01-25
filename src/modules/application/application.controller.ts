import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './application.repository';
import { AuthenticatedRequest } from '../../types';
import { ApplicationStage } from '@prisma/client';

export class ApplicationController extends BaseController {
  private applicationService: ApplicationService;

  constructor() {
    super();
    this.applicationService = new ApplicationService(new ApplicationRepository());
  }

  // Submit a new application
  submitApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const application = await this.applicationService.submitApplication(req.body);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get application by ID
  getApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.getApplication(id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get candidate's applications
  getCandidateApplications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { candidateId } = req.query as { candidateId: string };

      if (!candidateId) {
        return this.sendError(res, new Error('Candidate ID is required'), 400);
      }

      const applications = await this.applicationService.getCandidateApplications(candidateId);
      return this.sendSuccess(res, { applications });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get job applications (CRITICAL for /ats/jobs page)
  getJobApplications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const filters = req.query;

      const applications = await this.applicationService.getJobApplications(jobId, filters);
      return this.sendSuccess(res, { applications });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update application score
  updateScore = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { score } = req.body;

      if (typeof score !== 'number') {
        return this.sendError(res, new Error('Score must be a number'), 400);
      }

      const application = await this.applicationService.updateScore(id, score);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update application rank
  updateRank = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { rank } = req.body;

      if (typeof rank !== 'number') {
        return this.sendError(res, new Error('Rank must be a number'), 400);
      }

      const application = await this.applicationService.updateRank(id, rank);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update application tags
  updateTags = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { tags } = req.body;

      if (!Array.isArray(tags)) {
        return this.sendError(res, new Error('Tags must be an array'), 400);
      }

      const application = await this.applicationService.updateTags(id, tags);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Shortlist candidate
  shortlistCandidate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'), 401);
      }

      const application = await this.applicationService.shortlistCandidate(id, req.user.id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Unshortlist candidate
  unshortlistCandidate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.unshortlistCandidate(id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update application stage
  updateStage = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { stage } = req.body;

      if (!stage) {
        return this.sendError(res, new Error('Stage is required'), 400);
      }

      const application = await this.applicationService.updateStage(id, stage as ApplicationStage);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update application notes
  updateNotes = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { notes } = req.body;

      if (typeof notes !== 'string') {
        return this.sendError(res, new Error('Notes must be a string'), 400);
      }

      const application = await this.applicationService.updateNotes(id, notes);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Withdraw application
  withdrawApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { candidateId } = req.body;

      if (!candidateId) {
        return this.sendError(res, new Error('Candidate ID is required'), 400);
      }

      const application = await this.applicationService.withdrawApplication(id, candidateId);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Delete application
  deleteApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { candidateId } = req.body;

      if (!candidateId) {
        return this.sendError(res, new Error('Candidate ID is required'), 400);
      }

      await this.applicationService.deleteApplication(id, candidateId);
      return this.sendSuccess(res, { message: 'Application deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Mark application as read
  markAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.markAsRead(id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Bulk score candidates
  bulkScoreCandidates = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationIds, scores } = req.body;

      if (!Array.isArray(applicationIds) || !scores) {
        return this.sendError(res, new Error('Application IDs array and scores object are required'), 400);
      }

      const updatedCount = await this.applicationService.bulkScoreCandidates(applicationIds, scores);
      return this.sendSuccess(res, { updatedCount, message: `${updatedCount} application(s) scored successfully` });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get application count for job
  getApplicationCountForJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const counts = await this.applicationService.getApplicationCountForJob(jobId);
      return this.sendSuccess(res, counts);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Check if candidate has applied to job
  checkApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { candidateId, jobId } = req.query as { candidateId: string; jobId: string };

      if (!candidateId || !jobId) {
        return this.sendError(res, new Error('Candidate ID and Job ID are required'), 400);
      }

      const hasApplied = await this.applicationService.checkApplication(candidateId, jobId);
      return this.sendSuccess(res, { hasApplied });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
