import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './application.repository';
import { UnifiedAuthenticatedRequest } from '../../types';
import { ApplicationStage, ManualScreeningStatus } from '@prisma/client';
import { CloudinaryService } from '../storage/cloudinary.service';


export class ApplicationController extends BaseController {
  private applicationService: ApplicationService;

  constructor() {
    super();
    this.applicationService = new ApplicationService(new ApplicationRepository());
  }

  // Submit a new application
  submitApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const data = { ...req.body };

      // Derive candidateId from session if available
      if (req.candidate) {
        data.candidateId = req.candidate!.id;
      }

      const application = await this.applicationService.submitApplication(data);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get application by ID
  getApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.getApplication(id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get candidate's applications
  getCandidateApplications = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const candidateId = (req.candidate?.id || req.query.candidateId) as string;


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
  getJobApplications = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  updateScore = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  updateRank = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  updateTags = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  shortlistCandidate = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  unshortlistCandidate = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.unshortlistCandidate(id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update application stage
  updateStage = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  updateNotes = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  withdrawApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const candidateId = (req.candidate?.id || req.body.candidateId) as string;


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
  deleteApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      let { candidateId } = req.body;

      if (req.candidate) {
        candidateId = req.candidate!.id;
      }

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
  markAsRead = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.markAsRead(id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Bulk score candidates
  bulkScoreCandidates = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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
  getApplicationCountForJob = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const counts = await this.applicationService.getApplicationCountForJob(jobId);
      return this.sendSuccess(res, counts);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Check if candidate has applied to job
  checkApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const candidateId = (req.candidate?.id || req.params.candidateId || req.query.candidateId) as string;
      const jobId = (req.params.jobId || req.query.jobId) as string;


      if (!candidateId || !jobId) {
        return this.sendError(res, new Error('Candidate ID and Job ID are required'), 400);
      }

      const hasApplied = await this.applicationService.checkApplication(candidateId, jobId);
      return this.sendSuccess(res, { hasApplied });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Submit anonymous application
  submitAnonymousApplication = async (req: Request, res: Response) => {
    try {
      const application = await this.applicationService.submitAnonymousApplication(req.body);
      return this.sendSuccess(res, { application }, 'Application submitted successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Accept job invitation
  acceptJobInvitation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Candidate not authenticated'), 401);
      const { token, applicationData } = req.body;
      const application = await this.applicationService.acceptJobInvitation(
        req.candidate!.id,
        token,
        applicationData
      );
      return this.sendSuccess(res, { application }, 'Invitation accepted successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get application for admin view
  getApplicationForAdmin = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const application = await this.applicationService.getApplicationForAdmin(id);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get application resume
  getApplicationResume = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const resume = await this.applicationService.getApplicationResume(id);
      return this.sendSuccess(res, resume);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Create manual application by recruiter
  createManualApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'), 401);
      const { jobId, candidateId, ...data } = req.body;
      const application = await this.applicationService.createManualApplication(
        req.user.companyId as string,
        jobId,
        candidateId,
        req.user.id,
        data
      );
      return this.sendSuccess(res, { application }, 'Manual application created successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Add application from talent pool
  addFromTalentPool = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'), 401);
      const { jobId, candidateId } = req.body;
      const application = await this.applicationService.addFromTalentPool(
        jobId,
        candidateId,
        req.user.id,
        req.user.companyId as string
      );
      return this.sendSuccess(res, { application }, 'Candidate added from talent pool');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Move application to round
  moveToRound = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = req.params.id as string;
      const roundId = req.params.roundId as string;
      const progress = await this.applicationService.moveToRound(id, roundId, req.user!.id);
      return this.sendSuccess(res, { progress }, 'Application moved to round successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update manual screening
  updateManualScreening = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = req.params.id as string;
      const application = await this.applicationService.updateManualScreening(id, req.body);
      return this.sendSuccess(res, { application }, 'Manual screening updated successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Upload an application file
   * POST /api/applications/upload
   */
  uploadFile = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return this.sendError(res, new Error('No file provided'), 400);
      }

      const result = await CloudinaryService.uploadMulterFile(req.file, { folder: 'hrm8/applications' });

      const fileData = {
        url: result.secureUrl,
        publicId: result.publicId,
        filename: req.file.originalname,
        format: result.format,
        size: result.bytes,
      };

      return this.sendSuccess(res, fileData, 'File uploaded successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Delete an application file
   * DELETE /api/applications/upload/:publicId
   */
  deleteFile = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const publicId = req.params.publicId as string;

      if (!publicId) {
        return this.sendError(res, new Error('Public ID is required'), 400);
      }

      await CloudinaryService.deleteFile(publicId);

      return this.sendSuccess(res, { success: true }, 'File deleted successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
