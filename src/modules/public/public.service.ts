import { BaseService } from '../../core/service';
import { JobRepository } from '../job/job.repository';
import { CompanyRepository } from '../company/company.repository';
import { JobStatus } from '@prisma/client';

export class PublicService extends BaseService {
  constructor(
    private jobRepository: JobRepository,
    private companyRepository: CompanyRepository
  ) {
    super();
  }

  async getPublicJobs(filters: any) {
    const { limit, offset, ...queryFilters } = filters;
    
    // Transform filters to Prisma where clause format
    const where: any = {};
    if (queryFilters.search) {
      where.OR = [
        { title: { contains: queryFilters.search, mode: 'insensitive' } },
        { description: { contains: queryFilters.search, mode: 'insensitive' } }
      ];
    }
    // Add other filter mappings as needed...

    return this.jobRepository.findPublicJobs(where, limit, offset);
  }

  async getPublicJob(id: string) {
    const job = await this.jobRepository.findById(id);
    if (!job || job.status !== 'OPEN' || job.visibility !== 'public') {
      return null;
    }
    
    // Check expiry
    if (job.expires_at && new Date() > job.expires_at) {
      return null;
    }

    const company = await this.companyRepository.findById(job.company_id);
    
    return {
      ...job,
      company: company ? {
        id: company.id,
        name: company.name,
        website: company.website,
        logoUrl: company.careers_page_logo
      } : null
    };
  }
}
