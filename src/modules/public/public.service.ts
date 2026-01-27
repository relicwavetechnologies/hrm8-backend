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

  // Get public companies with careers pages
  async getCareersCompanies() {
    const companies = await this.prisma.company.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        careers_page_logo: true,
        careers_page_banner: true,
        careers_page_about: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return companies;
  }

  // Get company careers page details
  async getCompanyCareersPage(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
      },
      include: {
        jobs: {
          where: {
            status: 'OPEN',
          },
          select: {
            id: true,
            title: true,
            location: true,
            employment_type: true,
            created_at: true,
          },
        },
      },
    });

    return company;
  }

  // Get available filter options
  async getJobFilters() {
    const [locations, employmentTypes] = await Promise.all([
      this.prisma.job.findMany({
        where: { status: 'OPEN' },
        select: { location: true },
        distinct: ['location'],
      }),
      this.prisma.job.findMany({
        where: { status: 'OPEN' },
        select: { employment_type: true },
        distinct: ['employment_type'],
      }),
    ]);

    return {
      locations: locations.map((l: any) => l.location).filter(Boolean),
      categories: [], // Category model needs to be added to schema
      employmentTypes: employmentTypes.map((e: any) => e.employment_type).filter(Boolean),
    };
  }

  // Get filter aggregations for faceted search
  async getJobAggregations(filters: any) {
    const where: any = {
      status: 'OPEN',
    };

    const [locationCounts, typeCounts] = await Promise.all([
      this.prisma.job.groupBy({
        by: ['location'],
        where,
        _count: { id: true },
      }),
      this.prisma.job.groupBy({
        by: ['employment_type'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      locations: locationCounts.map((l: any) => ({ value: l.location, count: l._count.id })),
      categories: [], // Category model needs to be added to schema
      employmentTypes: typeCounts.map((t: any) => ({ value: t.employment_type, count: t._count.id })),
    };
  }

  // Get job application form structure
  async getJobApplicationForm(jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        status: 'OPEN',
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!job) {
      return null;
    }

    return {
      jobId: job.id,
      jobTitle: job.title,
      fields: [], // Application form fields to be implemented
    };
  }

  // Get related jobs
  async getRelatedJobs(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { location: true, company_id: true },
    });

    if (!job) {
      return [];
    }

    const relatedJobs = await this.prisma.job.findMany({
      where: {
        id: { not: jobId },
        status: 'OPEN',
        OR: [
          { location: job.location },
          { company_id: job.company_id },
        ],
      },
      select: {
        id: true,
        title: true,
        location: true,
        employment_type: true,
        company: {
          select: {
            name: true,
            careers_page_logo: true,
          },
        },
      },
      take: 5,
    });

    return relatedJobs;
  }

  // Get company jobs by domain
  async getCompanyJobsByDomain(domain: string) {
    const company = await this.prisma.company.findFirst({
      where: { domain },
      include: {
        jobs: {
          where: {
            status: 'OPEN',
          },
          select: {
            id: true,
            title: true,
            location: true,
            employment_type: true,
            created_at: true,
          },
        },
      },
    });

    return company;
  }

  // Get company branding info
  async getCompanyBranding(domain: string) {
    const company = await this.prisma.company.findFirst({
      where: { domain },
      select: {
        id: true,
        name: true,
        domain: true,
        careers_page_logo: true,
        careers_page_banner: true,
        careers_page_about: true,
      },
    });

    return company;
  }

  // Get public job categories
  async getPublicCategories() {
    // NOTE: Category model needs to be added to Prisma schema
    // For now, returning empty array
    return [];
  }
}
