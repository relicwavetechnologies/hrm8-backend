import { BaseService } from '../../core/service';
import { JobRepository } from './job.repository';
import { Job, JobStatus, AssignmentMode, JobAssignmentMode } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class JobService extends BaseService {
  constructor(private jobRepository: JobRepository) {
    super();
  }

  async createJob(companyId: string, createdBy: string, data: any): Promise<Job> {
    const jobCode = await this.generateJobCode(companyId);
    
    // Check company settings for assignment mode
    // Ideally this should fetch company settings from CompanyService/Repo
    // Assuming defaults for now or logic to be injected
    const assignmentMode = data.assignmentMode || 'AUTO';

    return this.jobRepository.create({
      ...data,
      company: { connect: { id: companyId } },
      created_by: createdBy,
      job_code: jobCode,
      status: 'DRAFT',
      assignment_mode: assignmentMode,
      // Map other fields as necessary from data...
      // Ensure camelCase to snake_case mapping or rely on Prisma types matching
      hiring_mode: data.hiringMode,
      work_arrangement: data.workArrangement,
      employment_type: data.employmentType,
      number_of_vacancies: data.numberOfVacancies || 1,
      salary_currency: data.salaryCurrency || 'USD',
      promotional_tags: data.promotionalTags || [],
      video_interviewing_enabled: data.videoInterviewingEnabled || false,
    });
  }

  async updateJob(id: string, companyId: string, data: any) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');

    // Map fields for update
    // Note: In a real scenario, use a mapper or cleaner input object
    return this.jobRepository.update(id, data);
  }

  async getJob(id: string, companyId: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    return job;
  }

  async getCompanyJobs(companyId: string, filters: any) {
    return this.jobRepository.findByCompanyIdWithFilters(companyId, filters);
  }

  async deleteJob(id: string, companyId: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    
    return this.jobRepository.delete(id);
  }

  private async generateJobCode(companyId: string): Promise<string> {
    const count = await this.jobRepository.countByCompany(companyId);
    return `JOB-${String(count + 1).padStart(3, '0')}`;
  }
}
