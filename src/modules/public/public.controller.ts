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
}
