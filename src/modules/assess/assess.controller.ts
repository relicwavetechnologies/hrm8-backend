import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AssessService } from './assess.service';
import { AuthenticatedRequest } from '../../types';

export class AssessController extends BaseController {
  private assessService: AssessService;

  constructor() {
    super();
    this.assessService = new AssessService();
  }

  // POST /api/assess/register - Register for assess platform (no auth)
  registerAssessUser = async (req: Request, res: Response) => {
    try {
      const user = await this.assessService.registerAssessUser(req.body);
      return this.sendSuccess(res, { user }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/login - Login for assess platform (no auth)
  loginAssessUser = async (req: Request, res: Response) => {
    try {
      const result = await this.assessService.loginAssessUser(req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/assess/me - Get current assess user (requires auth)
  getAssessUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const user = await this.assessService.getAssessUser(req.user.id);
      return this.sendSuccess(res, { user });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/logout - Logout from assess (requires auth)
  logoutAssessUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const result = await this.assessService.logoutAssessUser(req.user.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/assess/job-options - Get available job options (no auth)
  getJobOptions = async (req: Request, res: Response) => {
    try {
      const { location, category, employmentType } = req.query;
      const jobs = await this.assessService.getJobOptions({
        location: location as string,
        category: category as string,
        employmentType: employmentType as string,
      });
      return this.sendSuccess(res, { jobs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/recommendations - Get AI recommendations (no auth, but can use userId if provided)
  getRecommendations = async (req: Request, res: Response) => {
    try {
      const recommendations = await this.assessService.getRecommendations(req.body);
      return this.sendSuccess(res, { recommendations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/jobs - Create internal job posting (requires auth)
  createInternalJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const job = await this.assessService.createInternalJob({
        ...req.body,
        companyId: req.user.companyId,
        createdBy: req.user.id,
      });

      return this.sendSuccess(res, { job }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/jobs/upload-description - Upload and parse JD (requires auth)
  uploadPositionDescription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return this.sendError(res, new Error('No file uploaded'), 400);
      }

      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const parsedData = await this.assessService.uploadPositionDescription(req.file, req.user.companyId);
      return this.sendSuccess(res, parsedData);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/assess/my-jobs - Get internal jobs for current company (requires auth)
  getMyJobs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const jobs = await this.assessService.getMyJobs(req.user.companyId);
      return this.sendSuccess(res, { jobs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/assess/balance - Get company credit balance (requires auth)
  getCompanyBalance = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const balance = await this.assessService.getCompanyBalance(req.user.companyId);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/test-credits - Add test credits (requires auth, dev only)
  addTestCredits = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { amount } = req.body;
      const result = await this.assessService.addTestCredits(req.user.companyId, amount, req.user.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/assess/jobs/:jobId - Get job with candidates (requires auth)
  getJobWithCandidates = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { jobId } = req.params;
      const job = await this.assessService.getJobWithCandidates(jobId as string, req.user.companyId);
      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/jobs/:jobId/candidates - Add candidate to internal job (requires auth)
  addCandidateToJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { jobId } = req.params;
      const application = await this.assessService.addCandidateToJob(
        jobId as string,
        req.body,
        req.user.companyId,
        req.user.id,
        req.file
      );
      return this.sendSuccess(res, { application }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/upload-cv - Upload candidate CV (requires auth)
  uploadCandidateCV = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return this.sendError(res, new Error('No file uploaded'), 400);
      }

      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const candidateData = await this.assessService.uploadCandidateCV(req.file, req.user.companyId);
      return this.sendSuccess(res, candidateData);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/assess/jobs/:jobId/candidates/:candidateId/move - Move candidate (requires auth)
  moveCandidate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { applicationId, stage } = req.body;
      const application = await this.assessService.moveCandidate(
        applicationId,
        stage,
        req.user.companyId,
        req.user.id
      );
      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
