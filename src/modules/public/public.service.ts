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

  async getApplicationForm(jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job || job.status !== 'OPEN' || job.visibility !== 'public') {
      return null;
    }

    const appForm = (job.application_form as Record<string, unknown>) || {};
    return {
      jobId: job.id,
      jobTitle: job.title,
      questions: (appForm.questions as unknown[]) || [],
      requireResume: (appForm.requireResume as boolean) !== false,
      requireCoverLetter: (appForm.requireCoverLetter as boolean) === true,
      requirePortfolio: (appForm.requirePortfolio as boolean) === true
    };
  }

  async submitGuestApplication(data: any) {
    // Import services
    const { CandidateRepository } = await import('../candidate/candidate.repository');
    const { ApplicationRepository } = await import('../application/application.repository');
    const bcrypt = await import('bcrypt');
    const candidateRepository = new CandidateRepository();
    const applicationRepository = new ApplicationRepository();

    const { 
      jobId, 
      email, 
      password,
      firstName, 
      lastName, 
      phone,
      resumeUrl,
      coverLetterUrl,
      portfolioUrl,
      answers
    } = data;

    // Validate job exists and is open
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    if (job.status !== 'OPEN') {
      throw new Error('Job is not accepting applications');
    }

    // Check if candidate exists
    let candidate = await candidateRepository.findByEmail(email.toLowerCase());
    
    if (candidate) {
      throw new Error('An account with this email already exists. Please login to apply.');
    }

    // Create new candidate account
    const hashedPassword = await bcrypt.hash(password, 10);
    
    candidate = await candidateRepository.create({
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      status: 'ACTIVE',
      email_verified: false
    } as any);

    // Create application
    const application = await applicationRepository.create({
      candidate: { connect: { id: candidate.id } },
      job: { connect: { id: jobId } },
      status: 'NEW',
      stage: 'NEW_APPLICATION',
      resume_url: resumeUrl || null,
      cover_letter_url: coverLetterUrl || null,
      portfolio_url: portfolioUrl || null,
      custom_answers: (answers || {}) as object
    });

    return {
      application,
      candidate: {
        id: candidate.id,
        email: candidate.email,
        firstName: candidate.first_name,
        lastName: candidate.last_name
      }
    };
  }
}
