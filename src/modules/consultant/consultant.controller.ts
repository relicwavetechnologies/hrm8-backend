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
      return this.sendSuccess(res, { pipeline: result.pipeline });
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
}
