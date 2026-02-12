import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { ConsultantService } from './consultant.service';
import { ConsultantCandidateService } from './consultant-candidate.service';
import { ConsultantWithdrawalService } from './consultant-withdrawal.service';
import { CommissionService } from '../hrm8/commission.service';
import { CommissionRepository } from '../hrm8/commission.repository';
import { ConversationService } from '../communication/conversation.service';
import { ConsultantAuthenticatedRequest } from '../../types';
import { ApplicationStatus, ApplicationStage } from '@prisma/client';
import { getSessionCookieOptions } from '../../utils/session';

export class ConsultantController extends BaseController {
  private consultantService: ConsultantService;
  private candidateService: ConsultantCandidateService;
  private withdrawalService: ConsultantWithdrawalService;
  private conversationService: ConversationService;

  constructor() {
    super();
    this.consultantService = new ConsultantService();
    this.candidateService = new ConsultantCandidateService();
    this.withdrawalService = new ConsultantWithdrawalService();
    this.conversationService = new ConversationService();
  }

  // ... existing methods ...

  // Auth
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const { consultant, sessionId } = await this.consultantService.login({ email, password });

      res.cookie('consultantToken', sessionId, getSessionCookieOptions());

      return this.sendSuccess(res, {
        consultant: {
          id: consultant.id,
          email: consultant.email,
          firstName: consultant.first_name,
          lastName: consultant.last_name,
          role: consultant.role
        }
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCurrentUser = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      // Middleware already validates and populates req.consultant
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));

      // Optional: fetch fresh full profile if needed, but req.consultant is usually enough for "me"
      // Or call getProfile for full details
      const consultant = await this.consultantService.getProfile(req.consultant.id);

      return this.sendSuccess(res, { consultant });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Candidates & Pipeline
  getPipeline = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { jobId } = req.params;
      const result = await this.candidateService.getPipeline(consultantId, jobId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobRounds = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { jobId } = req.params;
      const result = await this.candidateService.getJobRounds(consultantId, jobId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateCandidateStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { applicationId } = req.params;
      const { status, stage } = req.body;
      const result = await this.candidateService.updateStatus(consultantId, applicationId as string, status as ApplicationStatus, stage as ApplicationStage);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addCandidateNote = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { applicationId } = req.params;
      const { note } = req.body;
      await this.candidateService.addNote(consultantId, applicationId as string, note);
      return this.sendSuccess(res, { message: 'Note added' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  moveCandidateToRound = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { applicationId } = req.params;
      const { roundId } = req.body;
      await this.candidateService.moveToRound(consultantId, applicationId as string, roundId);
      return this.sendSuccess(res, { message: 'Moved to round' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateCandidateStage = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { applicationId } = req.params;
      const { stage } = req.body;
      const result = await this.candidateService.updateStage(consultantId, applicationId as string, stage);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Messaging
  listConversations = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.conversationService.listConversationsForParticipant(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getMessages = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { conversationId } = req.params;
      // Verify participation first? Service usually handles it or returns empty.
      // Deep verification recommended.
      const conversation = await this.conversationService.getConversation(conversationId as string);
      if (!conversation || !conversation.participants.some(p => p.participant_id === consultantId)) {
        return this.sendError(res, new Error('Conversation not found or access denied'), 404);
      }

      const result = await this.conversationService.listMessages(conversationId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  sendMessage = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { conversationId } = req.params;
      const { content, contentType } = req.body;

      const result = await this.conversationService.createMessage({
        conversationId: conversationId as string,
        senderType: 'CONSULTANT',
        senderId: consultantId,
        senderEmail: req.consultant!.email,
        content,
        contentType
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markMessagesRead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { conversationId } = req.params;
      const count = await this.conversationService.markMessagesAsRead(conversationId as string, consultantId);
      return this.sendSuccess(res, { updated: count });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Withdrawals
  getWithdrawalBalance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.withdrawalService.calculateBalance(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  requestWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.withdrawalService.requestWithdrawal(consultantId, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWithdrawals = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { status } = req.query;
      const result = await this.withdrawalService.getWithdrawals(consultantId, status as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { id } = req.params;
      const result = await this.withdrawalService.cancelWithdrawal(id as string, consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getProfile = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.consultantService.getProfile(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateProfile = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.consultantService.updateProfile(consultantId, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobs = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      console.log(`[ConsultantController.getJobs] Request from consultantId: ${consultantId}`);

      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { status } = req.query;
      console.log(`[ConsultantController.getJobs] Fetching jobs with status: ${status}`);

      const result = await this.consultantService.getAssignedJobs(consultantId, { status: status as string });
      console.log(`[ConsultantController.getJobs] Found ${result.length} jobs`);

      return this.sendSuccess(res, result);
    } catch (error) {
      console.error('[ConsultantController.getJobs] Error:', error);
      return this.sendError(res, error);
    }
  };

  getJobDetails = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { jobId } = req.params;
      console.log(`[ConsultantController.getJobDetails] Request for jobId: "${jobId}" by consultant: ${consultantId}`);

      const result = await this.consultantService.getJobDetails(consultantId, jobId as string);
      console.log(`[ConsultantController.getJobDetails] Success`);
      return this.sendSuccess(res, result);
    } catch (error) {
      console.error(`[ConsultantController.getJobDetails] Error:`, error);
      return this.sendError(res, error);
    }
  };

  submitShortlist = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { jobId } = req.params;
      const { candidateIds, notes } = req.body;
      await this.consultantService.submitShortlist(consultantId, jobId as string, candidateIds, notes);
      return this.sendSuccess(res, { message: 'Shortlist submitted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  flagJob = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      // TODO: Implement actual flag logic
      // const { jobId } = req.params;
      return this.sendSuccess(res, { message: 'Job flagged' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  logJobActivity = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { jobId } = req.params;
      const { activityType, notes } = req.body;
      await this.consultantService.logJobActivity(consultantId, jobId as string, activityType, notes);
      return this.sendSuccess(res, { message: 'Activity logged' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  requestCommission = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const commissionService = new CommissionService(new CommissionRepository());
      const commission = await commissionService.requestCommission({
        consultantId,
        type: req.body.type,
        amount: req.body.amount,
        jobId: req.body.jobId,
        subscriptionId: req.body.subscriptionId,
        description: req.body.description,
        calculateFromJob: req.body.calculateFromJob,
        rate: req.body.rate,
      });
      return this.sendSuccess(res, { commission });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCommissions = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.consultantService.getCommissions(consultantId, req.query);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getPerformance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.consultantService.getPerformanceMetrics(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getDashboardAnalytics = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.consultantService.getDashboardAnalytics(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  logout = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.cookies?.consultantToken;
      if (sessionId) {
        await this.consultantService.logout(sessionId);
      }
      res.clearCookie('consultantToken', getSessionCookieOptions());
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobPipeline = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { jobId } = req.params;
      // Reusing getJobDetails as it contains pipeline data, filtering just pipeline info would be extra optimization
      // but valid deeply implemented logic is to fetch details.
      // Or we can just fetch pipeline specific:
      const details = await this.consultantService.getJobDetails(consultantId, jobId as string);
      return this.sendSuccess(res, details.pipeline || {});
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJobPipeline = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { jobId } = req.params;
      const { stage, note } = req.body;
      const result = await this.consultantService.updateJobPipeline(consultantId, jobId as string, { stage, note });
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  executeWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const { id } = req.params;
      const result = await this.withdrawalService.executeWithdrawal(id as string, consultantId);
      return this.sendSuccess(res, { withdrawal: result, message: 'Withdrawal execution initiated' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.withdrawalService.getStripeStatus(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  initiateStripeOnboarding = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.withdrawalService.initiateStripeOnboarding(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeLoginLink = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.withdrawalService.getStripeLoginLink(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
