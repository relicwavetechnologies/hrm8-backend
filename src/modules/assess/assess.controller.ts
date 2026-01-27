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
      });

      return this.sendSuccess(res, { job }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
