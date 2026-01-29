import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { PublicService } from './public.service';
import { JobRepository } from '../job/job.repository';
import { CompanyRepository } from '../company/company.repository';

export class PublicController extends BaseController {
  private publicService: PublicService;

  constructor() {
    super();
    // In a real app, use dependency injection container
    this.publicService = new PublicService(new JobRepository(), new CompanyRepository());
  }

  getJobs = async (req: Request, res: Response) => {
    try {
      const { search, page, limit, location, category, employmentType, companyId } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;

      const result = await this.publicService.getPublicJobs({
        search,
        location,
        category,
        employmentType,
        companyId,
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

  getJobDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const job = await this.publicService.getPublicJob(id);

      if (!job) {
        return this.sendError(res, new Error('Job not found or no longer available'));
      }

      return this.sendSuccess(res, { job });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/careers/companies
  getCareersCompanies = async (req: Request, res: Response) => {
    try {
      const companies = await this.publicService.getCareersCompanies();
      return this.sendSuccess(res, { companies });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/careers/companies/:id
  getCompanyCareersPage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const company = await this.publicService.getCompanyCareersPage(id);

      if (!company) {
        return this.sendError(res, new Error('Company careers page not found'));
      }

      return this.sendSuccess(res, { company });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/jobs/filters
  getJobFilters = async (req: Request, res: Response) => {
    try {
      const filters = await this.publicService.getJobFilters();
      return this.sendSuccess(res, filters);
    } catch (error: any) {
      console.error('Error fetching job filters:', error);
      return this.sendError(res, error);
    }
  };

  // GET /api/public/jobs/aggregations
  getJobAggregations = async (req: Request, res: Response) => {
    try {
      const aggregations = await this.publicService.getJobAggregations(req.query);
      return this.sendSuccess(res, aggregations);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/jobs/:jobId/application-form
  getJobApplicationForm = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const form = await this.publicService.getJobApplicationForm(jobId);

      if (!form) {
        return this.sendError(res, new Error('Job not found or application form not available'));
      }

      return this.sendSuccess(res, form);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/jobs/:jobId/related
  getRelatedJobs = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const jobs = await this.publicService.getRelatedJobs(jobId);
      return this.sendSuccess(res, { jobs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/companies/:domain/jobs
  getCompanyJobsByDomain = async (req: Request, res: Response) => {
    try {
      const { domain } = req.params as { domain: string };
      const company = await this.publicService.getCompanyJobsByDomain(domain);

      if (!company) {
        return this.sendError(res, new Error('Company not found'));
      }

      return this.sendSuccess(res, { company });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/companies/:domain/branding
  getCompanyBranding = async (req: Request, res: Response) => {
    try {
      const { domain } = req.params as { domain: string };
      const branding = await this.publicService.getCompanyBranding(domain);

      if (!branding) {
        return this.sendError(res, new Error('Company not found'));
      }

      return this.sendSuccess(res, { branding });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/public/categories
  getPublicCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.publicService.getPublicCategories();
      return this.sendSuccess(res, { categories });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/public/jobs/:jobId/track
  trackAnalytics = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params as { jobId: string };
      const { event_type, source, session_id, referrer } = req.body;

      const ip_address = req.ip || req.socket.remoteAddress;
      const user_agent = req.headers['user-agent'];

      await this.publicService.trackAnalytics(jobId, {
        event_type,
        source,
        session_id,
        referrer,
        ip_address: typeof ip_address === 'string' ? ip_address : undefined,
        user_agent
      });

      return this.sendSuccess(res, { success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
