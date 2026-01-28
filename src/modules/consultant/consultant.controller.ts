import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { ConsultantService } from './consultant.service';
import { ConsultantRepository } from './consultant.repository';
import { ConsultantAuthenticatedRequest } from '../../types';
import { getSessionCookieOptions } from '../../utils/session';
import { jobAllocationService } from '../hrm8/job-allocation.service';

export class ConsultantController extends BaseController {
  private consultantService: ConsultantService;

  constructor() {
    super();
    this.consultantService = new ConsultantService(new ConsultantRepository());
  }

  // Auth
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const { consultant, sessionId } = await this.consultantService.login({ email, password });
      res.cookie('consultantSessionId', sessionId, getSessionCookieOptions());
      // Filter sensitive data
      const { password_hash, ...consultantData } = consultant;
      return this.sendSuccess(res, { consultant: consultantData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies?.consultantSessionId;
      if (sessionId) {
        await this.consultantService.logout(sessionId);
      }
      res.clearCookie('consultantSessionId', getSessionCookieOptions());
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  setupAccount = async (req: Request, res: Response) => {
    try {
      await this.consultantService.setupAccount(req.body);
      return this.sendSuccess(res, { message: 'Account set up successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCurrentConsultant = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    // Alias to getProfile
    return this.getProfile(req, res);
  };


  // Profile
  getProfile = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const consultant = await this.consultantService.getProfile(req.consultant.id);
      const { password_hash, ...consultantData } = consultant;
      return this.sendSuccess(res, { consultant: consultantData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateProfile = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const consultant = await this.consultantService.updateProfile(req.consultant.id, req.body);
      const { password_hash, ...consultantData } = consultant;
      return this.sendSuccess(res, { consultant: consultantData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Jobs
  getJobs = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const jobs = await this.consultantService.getAssignedJobs(req.consultant.id, req.query);
      return this.sendSuccess(res, { jobs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobDetails = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const job = await this.consultantService.getJobDetails(req.consultant.id, id);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  submitShortlist = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const { candidateIds, notes } = req.body;
      await this.consultantService.submitShortlist(req.consultant.id, id, candidateIds, notes);
      return this.sendSuccess(res, { message: 'Shortlist submitted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  flagJob = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const { issueType, description, severity } = req.body;
      await this.consultantService.flagJob(req.consultant.id, id, issueType, description, severity);
      return this.sendSuccess(res, { message: 'Job flagged' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  logJobActivity = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const { activityType, notes } = req.body;
      await this.consultantService.logJobActivity(req.consultant.id, id, activityType, notes);
      return this.sendSuccess(res, { message: 'Activity logged' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobPipeline = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const pipeline = await jobAllocationService.getPipelineForConsultantJob(req.consultant.id, id);
      return this.sendSuccess(res, { pipeline });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJobPipeline = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const result = await jobAllocationService.updatePipelineForConsultantJob(req.consultant.id, id, req.body);
      return this.sendSuccess(res, { pipeline: result ? (result as any).pipeline : req.body });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Commissions
  getCommissions = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const commissions = await this.consultantService.getCommissions(req.consultant.id, req.query);
      return this.sendSuccess(res, { commissions });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Performance
  getPerformance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const metrics = await this.consultantService.getPerformanceMetrics(req.consultant.id);
      return this.sendSuccess(res, { metrics });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
  // Analytics
  getDashboardAnalytics = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      // Combine performance metrics and maybe recent activity
      const metrics = await this.consultantService.getPerformanceMetrics(req.consultant.id);
      return this.sendSuccess(res, { analytics: metrics });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Messages
  listConversations = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const conversations = await this.consultantService.listConversations(req.consultant.id);
      return this.sendSuccess(res, { conversations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getMessages = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { conversationId } = req.params as { conversationId: string };
      const conversation = await this.consultantService.getMessages(req.consultant.id, conversationId);
      return this.sendSuccess(res, { conversation });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  sendMessage = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { conversationId } = req.params as { conversationId: string };
      const message = await this.consultantService.sendMessage(req.consultant.id, conversationId, req.body);
      return this.sendSuccess(res, { message });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markRead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { conversationId } = req.params as { conversationId: string };
      await this.consultantService.markMessageRead(req.consultant.id, conversationId);
      return this.sendSuccess(res, { success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Candidate Management
  getPipeline = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { jobId } = req.params as { jobId: string };
      const candidates = await this.consultantService.getJobCandidates(req.consultant.id, jobId);
      return this.sendSuccess(res, { candidates });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobRounds = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { jobId } = req.params as { jobId: string };
      const rounds = await this.consultantService.getJobRounds(req.consultant.id, jobId);
      return this.sendSuccess(res, { rounds });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { applicationId } = req.params as { applicationId: string };
      const result = await this.consultantService.updateCandidateStatus(req.consultant.id, applicationId, req.body);
      return this.sendSuccess(res, { result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addNote = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { applicationId } = req.params as { applicationId: string };
      const { note } = req.body;
      await this.consultantService.addCandidateNote(req.consultant.id, applicationId, note);
      return this.sendSuccess(res, { success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  moveToRound = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { applicationId } = req.params as { applicationId: string };
      await this.consultantService.moveCandidateToRound(req.consultant.id, applicationId, req.body);
      return this.sendSuccess(res, { success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateStage = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { applicationId } = req.params as { applicationId: string };
      const { stage } = req.body;
      await this.consultantService.updateCandidateStage(req.consultant.id, applicationId, stage);
      return this.sendSuccess(res, { success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Wallet & Withdrawals
  getWallet = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const balance = await this.consultantService.getWalletBalance(req.consultant.id);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  requestWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.consultantService.requestWithdrawal(req.consultant.id, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWithdrawals = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const withdrawals = await this.consultantService.getWithdrawals(req.consultant.id);
      return this.sendSuccess(res, withdrawals);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Stripe
  onboardStripe = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.consultantService.onboardStripe(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const status = await this.consultantService.getStripeStatus(req.consultant.id);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStripeDashboard = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const result = await this.consultantService.getStripeDashboard(req.consultant.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Commission Details
  getCommissionStats = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const stats = await this.consultantService.getCommissionStats(req.consultant.id);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCommissionDetails = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const comm = await this.consultantService.getCommissionDetails(req.consultant.id, id);
      return this.sendSuccess(res, comm);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
