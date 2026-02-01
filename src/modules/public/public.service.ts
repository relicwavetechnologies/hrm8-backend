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
      } : { name: 'Unknown Company' }
    };
  }

  async getRelatedJobs(jobId: string, limit: number = 5) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) return { jobs: [] };

    // Find jobs in same category or same company
    const where: any = {
      id: { not: jobId },
      status: 'OPEN',
      visibility: 'public',
      OR: [
        { category: job.category },
        { company_id: job.company_id }
      ]
    };

    return this.jobRepository.findPublicJobs(where, limit, 0);
  }

  async trackJobView(jobId: string, data: { event_type: string; source: string; session_id?: string; referrer?: string; ip?: string; userAgent?: string }) {
    try {
      await this.jobRepository.createJobAnalytics({
        job_id: jobId,
        event_type: data.event_type || 'VIEW',
        source: data.source || 'HRM8_BOARD',
        session_id: data.session_id,
        referrer: data.referrer,
        ip_address: data.ip,
        user_agent: data.userAgent
      });
      return true;
    } catch (error) {
      console.error('[PublicService] trackJobView failed:', error);
      return false;
    }
  }

  async getFilters() {
    return this.jobRepository.getPublicJobFilters();
  }

  async getAggregations() {
    return this.jobRepository.getPublicJobAggregations();
  }
}
