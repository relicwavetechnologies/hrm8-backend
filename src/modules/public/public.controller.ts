import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { PublicService } from './public.service';
import { JobRepository } from '../job/job.repository';
import { CompanyRepository } from '../company/company.repository';
import { jobTargetService } from '../jobtarget/jobtarget.service';

export class PublicController extends BaseController {
  private publicService: PublicService;

  constructor() {
    super();
    // In a real app, use dependency injection container
    this.publicService = new PublicService(new JobRepository(), new CompanyRepository());
  }

  getJobs = async (req: Request, res: Response) => {
    try {
      const { search, page, limit } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;

      const result = await this.publicService.getPublicJobs({
        search,
        limit: limitNum,
        offset
      });

      return this.sendSuccess(res, {
        jobs: result.jobs,
        pagination: {
          total: result.total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(result.total / limitNum)
        }
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCompanies = async (req: Request, res: Response) => {
    try {
      const { search, page, limit } = req.query;
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);
      const offset = (pageNum - 1) * limitNum;

      const result = await this.publicService.getPublicCompanies({
        search: typeof search === 'string' ? search : undefined,
        limit: limitNum,
        offset,
      });

      return this.sendSuccess(res, {
        companies: result.companies,
        pagination: {
          total: result.total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(result.total / limitNum),
        },
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCompanyDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { search, department, location, page, limit } = req.query;
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);
      const offset = (pageNum - 1) * limitNum;

      const result = await this.publicService.getPublicCompany(id, {
        search: typeof search === 'string' ? search : undefined,
        department: typeof department === 'string' ? department : undefined,
        location: typeof location === 'string' ? location : undefined,
        limit: limitNum,
        offset,
      });

      if (!result) {
        return this.sendError(res, new Error('Company not found'));
      }

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCompanyJobs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { search, department, location, page, limit } = req.query;
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);
      const offset = (pageNum - 1) * limitNum;

      const result = await this.publicService.getPublicCompanyJobs(id, {
        search: typeof search === 'string' ? search : undefined,
        department: typeof department === 'string' ? department : undefined,
        location: typeof location === 'string' ? location : undefined,
        limit: limitNum,
        offset,
      });

      if (!result) {
        return this.sendError(res, new Error('Company not found'));
      }

      return this.sendSuccess(res, {
        jobs: result.jobs,
        total: result.total,
        pagination: {
          total: result.total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(result.total / limitNum),
        },
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const invitationToken = req.query.invitation as string | undefined;
      const candidateEmail = req.query.email as string | undefined;

      const job = await this.publicService.getPublicJob(id, {
        invitationToken,
        candidateEmail,
      });

      if (!job) {
        return this.sendError(res, new Error('Job not found or no longer available'));
      }

      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getFilters = async (req: Request, res: Response) => {
    try {
      const filters = await this.publicService.getFilters();
      return this.sendSuccess(res, { data: filters });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getAggregations = async (req: Request, res: Response) => {
    try {
      const aggregations = await this.publicService.getAggregations();
      return this.sendSuccess(res, { data: aggregations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRelatedJobs = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const limit = parseInt(req.query.limit as string) || 5;
      const result = await this.publicService.getRelatedJobs(id, limit);
      return this.sendSuccess(res, { data: result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  trackJobView = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await this.publicService.trackJobView(id, {
        ...req.body,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return this.sendSuccess(res, { success: true });
    } catch (error) {
      // Don't fail the request if tracking fails
      return this.sendSuccess(res, { success: false });
    }
  };

  getApplicationForm = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const invitationToken = req.query.invitation as string | undefined;
      const candidateEmail = req.query.email as string | undefined;

      const form = await this.publicService.getApplicationForm(jobId, {
        invitationToken,
        candidateEmail,
      });

      if (!form) {
        return this.sendError(res, new Error('Job not found or no longer available'));
      }

      return this.sendSuccess(res, { form });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  submitGuestApplication = async (req: Request, res: Response) => {
    try {
      const payload = {
        ...req.body,
        jobTargetAttribution: req.body?.jobTargetAttribution || { rawQuery: req.query, ...req.query },
      };
      const result = await this.publicService.submitGuestApplication(payload);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobTargetQuestionnaire = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const incomingSecret = String(req.headers['x-jobtarget-webhook-secret'] || req.headers['x-jobtarget-secret'] || '');
      jobTargetService.verifyIncomingWebhookSecret(incomingSecret);
      const result = await this.publicService.getJobTargetQuestionnaire(jobId);
      return res.status(200).json(result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  receiveJobTargetApplicationDelivery = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const incomingSecret = String(req.headers['x-jobtarget-webhook-secret'] || req.headers['x-jobtarget-secret'] || '');
      jobTargetService.verifyIncomingWebhookSecret(incomingSecret);
      const result = await this.publicService.receiveJobTargetApplicationDelivery(jobId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
