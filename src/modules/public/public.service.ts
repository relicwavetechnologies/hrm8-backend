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
    const { limit, offset, search, location, category, employmentType, companyId } = filters;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (location && location !== 'All Locations') {
      where.location = location;
    }

    if (category && category !== 'All Categories') {
      where.category = category;
    }

    if (employmentType && employmentType !== 'All Types') {
      where.employment_type = employmentType;
    }

    if (companyId) {
      where.company_id = companyId;
    }

    const { jobs, total } = await this.jobRepository.findPublicJobs(where, limit, offset);
    return {
      jobs: jobs.map(job => this.mapJobToResponse(job)),
      total
    };
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

    return this.mapJobToResponse({
      ...job,
      company: company ? {
        id: company.id,
        name: company.name,
        website: company.website,
        logoUrl: company.careers_page_logo
      } : null
    });
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

  // Get company careers page details with jobs and filters
  async getCompanyCareersPage(companyId: string, filters?: { search?: string; department?: string; location?: string }) {
    // First, get the company
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      return null;
    }

    // Build job where clause
    const jobWhere: any = {
      company_id: companyId,
      status: 'OPEN',
    };

    // Apply filters
    if (filters?.search) {
      jobWhere.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.department && filters.department !== 'All Departments') {
      jobWhere.category = filters.department;
    }

    if (filters?.location && filters.location !== 'All Locations') {
      jobWhere.location = filters.location;
    }

    // Get filtered jobs
    const jobs = await this.prisma.job.findMany({
      where: jobWhere,
      orderBy: { created_at: 'desc' },
    });

    // Get all available departments for this company
    const allDepartments = await this.prisma.job.findMany({
      where: { company_id: companyId, status: 'OPEN' },
      select: { category: true },
      distinct: ['category'],
    });

    // Get all available locations for this company
    const allLocations = await this.prisma.job.findMany({
      where: { company_id: companyId, status: 'OPEN' },
      select: { location: true },
      distinct: ['location'],
    });

    return {
      company,
      jobs: jobs.map(job => this.mapJobToResponse(job)),
      totalJobs: jobs.length,
      filters: {
        departments: allDepartments.map(d => d.category).filter(Boolean) as string[],
        locations: allLocations.map(l => l.location).filter(Boolean) as string[],
      },
    };
  }

  // Get available filter options
  async getJobFilters() {
    const [locations, employmentTypes, categories] = await Promise.all([
      this.prisma.job.findMany({
        where: { status: 'OPEN', visibility: 'public', archived: false },
        select: { location: true },
        distinct: ['location'],
      }),
      this.prisma.job.findMany({
        where: { status: 'OPEN', visibility: 'public', archived: false },
        select: { employment_type: true },
        distinct: ['employment_type'],
      }),
      this.prisma.job.findMany({
        where: { status: 'OPEN', visibility: 'public', archived: false },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    return {
      locations: locations.map((l: any) => l.location).filter(Boolean),
      categories: categories.map((c: any) => c.category).filter(Boolean),
      employmentTypes: employmentTypes.map((e: any) => e.employment_type).filter(Boolean),
    };
  }

  // Get filter aggregations for faceted search
  async getJobAggregations(filters: any) {
    const { search, location, category, employmentType, companyId } = filters;

    const where: any = {
      status: 'OPEN',
      visibility: 'public',
      archived: false
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (companyId) where.company_id = companyId;

    const [locationCounts, typeCounts, categoryCounts] = await Promise.all([
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
      this.prisma.job.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      locations: locationCounts.map((l: any) => ({ value: l.location, count: l._count.id })),
      employmentTypes: typeCounts.map((t: any) => ({ value: t.employment_type, count: t._count.id })),
      categories: categoryCounts.map((c: any) => ({ value: c.category, count: c._count.id }))
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
        application_form: true,
      },
    });

    if (!job) {
      return null;
    }

    // Default fields if application_form is empty
    const defaultFields = [
      { id: 'first_name', label: 'First Name', type: 'text', required: true },
      { id: 'last_name', label: 'Last Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'phone', label: 'Phone Number', type: 'text', required: true },
      { id: 'resume', label: 'Resume', type: 'file', required: true },
    ];

    return {
      jobId: job.id,
      jobTitle: job.title,
      fields: job.application_form || defaultFields,
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

  // Track analytics event
  async trackAnalytics(jobId: string, data: {
    event_type: string;
    source?: string;
    session_id?: string;
    referrer?: string;
    ip_address?: string;
    user_agent?: string;
  }) {
    await this.prisma.jobAnalytics.create({
      data: {
        job_id: jobId,
        event_type: data.event_type,
        source: data.source || 'HRM8_BOARD',
        session_id: data.session_id,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        referrer: data.referrer,
      }
    });

    if (data.event_type === 'DETAIL_VIEW') {
      await this.prisma.job.update({
        where: { id: jobId },
        data: { views_count: { increment: 1 } }
      });
    } else if (data.event_type === 'APPLY_CLICK') {
      await this.prisma.job.update({
        where: { id: jobId },
        data: { clicks_count: { increment: 1 } }
      });
    }

    return { success: true };
  }

  private mapJobToResponse(job: any): any {
    if (!job) return null;

    return {
      ...job,
      // Map snake_case to camelCase
      companyId: job.company_id,
      createdBy: job.created_by,
      jobCode: job.job_code,
      hiringMode: job.hiring_mode,
      workArrangement: job.work_arrangement,
      employmentType: job.employment_type,
      numberOfVacancies: job.number_of_vacancies,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryCurrency: job.salary_currency,
      salaryPeriod: job.salary_period,
      salaryDescription: job.salary_description,
      promotionalTags: job.promotional_tags,
      videoInterviewingEnabled: job.video_interviewing_enabled,
      assignmentMode: job.assignment_mode,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      postingDate: job.posting_date,
      closeDate: job.close_date,
      archivedAt: job.archived_at,
      archivedBy: job.archived_by,
      savedAsTemplate: job.saved_as_template,
      applicationForm: job.application_form,
      hiringTeam: job.hiring_team,
      servicePackage: job.service_package,
      paymentStatus: job.payment_status,
      assignedConsultantId: job.assigned_consultant_id,
      jobTargetChannels: job.job_target_channels,
    };
  }
}
