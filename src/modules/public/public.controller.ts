import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { PublicService } from './public.service';
import { JobRepository } from '../job/job.repository';
import { CompanyRepository } from '../company/company.repository';
import { CloudinaryService } from '../storage/cloudinary.service';
import crypto from 'crypto';

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
      const body = req.body as Record<string, string | undefined>;
      const files = req.files as { resume?: Express.Multer.File[]; cover_letter?: Express.Multer.File[]; portfolio?: Express.Multer.File[] } | undefined;

      if (!body || !body.jobId || !body.email || !body.firstName || !body.lastName) {
        return this.sendError(res, new Error('Missing required fields: jobId, email, firstName, lastName'), 400);
      }

      const resumeFiles = files?.resume;
      if (!resumeFiles?.length) {
        return this.sendError(res, new Error('Resume is required'), 400);
      }

      const jobId = String(body.jobId).trim();
      const folder = `hrm8/guest-applications/${jobId}`;

      const resumeUpload = await CloudinaryService.uploadMulterFile(resumeFiles[0], { folder, resourceType: 'raw' });
      let coverLetterUrl: string | undefined;
      let portfolioUrl: string | undefined;

      if (files?.cover_letter?.[0]) {
        const cl = await CloudinaryService.uploadMulterFile(files.cover_letter[0], { folder, resourceType: 'raw' });
        coverLetterUrl = cl.secureUrl;
      }
      if (files?.portfolio?.[0]) {
        const pf = await CloudinaryService.uploadMulterFile(files.portfolio[0], { folder, resourceType: 'raw' });
        portfolioUrl = pf.secureUrl;
      }

      const tempPassword = crypto.randomBytes(12).toString('base64url');

      const data = {
        jobId,
        email: String(body.email).trim(),
        password: tempPassword,
        firstName: String(body.firstName).trim(),
        lastName: String(body.lastName).trim(),
        phone: body.phone ? String(body.phone).trim() : undefined,
        resumeUrl: resumeUpload.secureUrl,
        coverLetterUrl,
        portfolioUrl,
        answers: {},
      };

      const result = await this.publicService.submitGuestApplication(data);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
