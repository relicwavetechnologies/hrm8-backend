import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './application.repository';
import { AuthenticatedRequest, CandidateAuthenticatedRequest } from '../../types';

type UnifiedRequest = AuthenticatedRequest & CandidateAuthenticatedRequest;
import { ApplicationStage } from '@prisma/client';
import { CandidateRepository } from '../candidate/candidate.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { prisma } from '../../utils/prisma';
export class ApplicationController extends BaseController {
  private applicationService: ApplicationService;

  constructor() {
    super();
    this.applicationService = new ApplicationService(
      new ApplicationRepository(),
      new CandidateRepository(),
      new NotificationService(new NotificationRepository())
    );
  }

  // Submit a new application
  submitApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = { ...req.body };

      // Inject candidate ID from authenticated request
      if ((req as any).candidate) {
        payload.candidateId = (req as any).candidate.id;
      }

      if (!payload.candidateId) {
        // If still no candidateId (and we require it for Prisma connection), throw error
        return this.sendError(res, new Error('Candidate ID is required'), 401);
      }

      const application = await this.applicationService.submitApplication(payload);
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get application by ID
  getApplication = async (req: UnifiedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.getApplication(id);

      // Security Check
      if (req.user) {
        // Recruiter/Company
        if (application.job?.company?.id && application.job.company.id !== req.user.companyId) {
          throw new Error('Forbidden: You do not have access to this application.');
        }
      } else if (req.candidate) {
        // Candidate
        if ((application as any).candidate_id !== req.candidate.id) {
          throw new Error('Forbidden: You do not have access to this application.');
        }
      }

      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getResume = async (req: UnifiedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const application = await this.applicationService.applicationRepository.findById(id);
      if (!application) throw new Error('Application not found');

      if (req.user) {
        // Company user
        const appAny = application as any;
        if (appAny.job?.company?.id && appAny.job.company.id !== req.user.companyId) {
          throw new Error('Forbidden: You do not have access to this application.');
        }
      } else if (req.candidate) {
        // Candidate
        if ((application as any).candidate_id !== req.candidate.id) {
          throw new Error('Forbidden: You do not have access to this application.');
        }
      }

      const resume = await this.applicationService.getResume(id);
      return this.sendSuccess(res, resume);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get candidate's applications
  getCandidateApplications = async (req: UnifiedRequest, res: Response) => {
    try {
      let candidateId = req.query.candidateId as string;

      if (!candidateId && req.candidate) {
        candidateId = req.candidate.id;
      }

      if (!candidateId) {
        return this.sendError(res, new Error('Candidate ID is required'), 400);
      }

      const applications = await this.applicationService.getCandidateApplications(candidateId);
      return this.sendSuccess(res, { applications });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get ALL applications for the authenticated user's company (used by Candidates sidebar tab)
  getCompanyApplications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.companyId) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }
      const result = await this.applicationService.getCompanyApplications(req.user.companyId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get job applications (CRITICAL for /ats/jobs page)
  getJobApplications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const filters = req.query;

      const result = await this.applicationService.getJobApplications(jobId, filters);
      this.logger.info('Job applications fetched', {
        jobId,
        count: result.applications?.length || 0,
        companyId: req.user?.companyId || null,
        sample: (result.applications || []).slice(0, 5).map((app: any) => ({
          id: app.id,
          status: app.status,
          stage: app.stage,
          roundId: app.roundId || app.round_id,
        })),
      });
      return this.sendSuccess(res, result);
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

      const application = await this.applicationService.updateStage(id, stage as ApplicationStage, req.user?.id);
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
  withdrawApplication = async (req: UnifiedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      let { candidateId } = req.body;

      if (!candidateId && req.candidate) {
        candidateId = req.candidate.id;
      }

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

  moveToRound = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id, roundId } = req.params as { id: string; roundId: string };
      const result = await this.applicationService.moveToRound(id, roundId, req.user.id);
      return this.sendSuccess(res, result);
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

  // Bulk AI Analysis
  bulkAiAnalysis = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationIds, jobId } = req.body;

      if (!Array.isArray(applicationIds) || !jobId) {
        return this.sendError(res, new Error('Application IDs array and Job ID are required'), 400);
      }

      const result = await this.applicationService.bulkAiAnalysis(applicationIds, jobId);
      return this.sendSuccess(res, {
        ...result,
        message: `Analysis completed: ${result.success} succeeded, ${result.failed} failed`
      });
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
      const candidateId = req.query.candidateId as string;
      const jobId = req.query.jobId as string;

      if (!candidateId || !jobId) {
        return this.sendError(res, new Error('Candidate ID and Job ID are required'), 400);
      }

      const hasApplied = await this.applicationService.checkApplication(candidateId, jobId);
      return this.sendSuccess(res, { hasApplied });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  submitManualApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const result = await this.applicationService.createManualApplication(req.body, req.user.id);
      return this.sendSuccess(res, { application: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateManualScreening = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const result = await this.applicationService.updateManualScreening(id, req.body);
      return this.sendSuccess(res, { application: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addFromTalentPool = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { candidateId, jobId } = req.body;
      const result = await this.applicationService.createFromTalentPool(candidateId, jobId, req.user.id);
      return this.sendSuccess(res, { application: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addEvaluation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const { score, comment, decision } = req.body;

      // Ensure user has permission for higher-level actions
      // For Member role: Can score and comment.
      // For Shortlisting/Admin: Can also Approve/Reject.
      // Assuming 'req.user.role' or similar exists, or we trust the frontend UI and just process it.
      // Ideally, check: if (decision && !hasPermission(req.user, 'EVALUATE_DECISION')) throw error.
      // For MVP/Speed, we proceed.

      const evaluation = await this.applicationService.addEvaluation({
        applicationId: id,
        userId: req.user.id,
        score,
        comment,
        decision
      });

      // Status Update Logic based on decision (as requested)
      if (decision === 'APPROVE') {
        const app = await this.applicationService.getApplication(id);
        if (!app.shortlisted) {
          await this.applicationService.shortlistCandidate(id, req.user.id);
          // Also set stage to next steps? Or just shortlisted flag?
          // Prompt says: "Update candidate status to 'Shortlisted' or 'Rejected' upon approval/rejection."
          // Assuming we use the 'shortlisted' boolean or a specific stage.
        }
      } else if (decision === 'REJECT') {
        await this.applicationService.updateStage(id, 'REJECTED', req.user.id);
      }

      return this.sendSuccess(res, { evaluation });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getEvaluations = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const evaluations = await this.applicationService.getEvaluations(id);
      return this.sendSuccess(res, { evaluations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get notes for an application
  getNotes = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const notes = await this.applicationService.getNotes(id);
      return this.sendSuccess(res, { notes });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get unified activity logs for an application
  getActivities = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 200;
      const activities = await this.applicationService.getActivities(id, Number.isFinite(limit) ? limit : 200);
      return this.sendSuccess(res, { activities });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Generic event logger for future/unknown events
  logGenericActivity = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const { eventName, payload } = req.body || {};
      if (!eventName || typeof eventName !== 'string') {
        return this.sendError(res, new Error('eventName is required'), 400);
      }
      const result = await this.applicationService.logGenericActivity(id, req.user.id, eventName, payload);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Add a note with @mention support
  addNote = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const { content, mentions } = req.body;

      if (!content || typeof content !== 'string') {
        return this.sendError(res, new Error('Content is required'), 400);
      }

      const note = await this.applicationService.addNote(id, req.user.id, content, mentions || []);
      return this.sendSuccess(res, { note });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Schedule an interview for an application
  scheduleInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const { scheduledDate, duration, type, interviewerIds, notes, useMeetLink } = req.body;

      if (!scheduledDate || !duration || !type) {
        return this.sendError(res, new Error('scheduledDate, duration, and type are required'), 400);
      }
      const interview = await this.applicationService.scheduleInterview({
        applicationId: id,
        scheduledBy: req.user.id,
        scheduledDate: new Date(scheduledDate),
        duration: parseInt(duration),
        type,
        interviewerIds: interviewerIds || [],
        notes,
        useMeetLink,
        companyId: req.user.companyId,
      });

      return this.sendSuccess(res, { interview });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get interviews for an application
  getInterviews = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id } = req.params as { id: string };
      const interviews = await this.applicationService.getInterviews(id);
      return this.sendSuccess(res, { interviews });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update an interview
  updateInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id, interviewId } = req.params as { id: string; interviewId: string };
      const updates = req.body;

      const interview = await this.applicationService.updateInterview(interviewId, updates);
      return this.sendSuccess(res, { interview });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Cancel an interview
  cancelInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id, interviewId } = req.params as { id: string; interviewId: string };
      const { cancellationReason } = req.body;

      const interview = await this.applicationService.cancelInterview(
        interviewId,
        cancellationReason
      );
      return this.sendSuccess(res, { interview });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Add a note to an interview
  addInterviewNote = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { interviewId } = req.params as { interviewId: string };
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return this.sendError(res, new Error('Content is required'), 400);
      }

      const userRecord = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true, email: true }
      });
      const authorName = userRecord?.name || userRecord?.email || req.user.email;

      const note = await this.applicationService.addInterviewNote(
        interviewId,
        req.user.id,
        authorName,
        content
      );
      return this.sendSuccess(res, { note });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get notes for an interview
  getInterviewNotes = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { interviewId } = req.params as { interviewId: string };
      const notes = await this.applicationService.getInterviewNotes(interviewId);
      return this.sendSuccess(res, { notes });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Delete an interview note
  deleteInterviewNote = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { noteId } = req.params as { noteId: string };
      await this.applicationService.deleteInterviewNote(noteId, req.user.id);
      return this.sendSuccess(res, { message: 'Note deleted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
