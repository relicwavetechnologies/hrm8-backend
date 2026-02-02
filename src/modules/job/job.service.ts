import { BaseService } from '../../core/service';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from '../application/application.repository';
import { Job, JobStatus, AssignmentMode, JobAssignmentMode, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { NotificationService } from '../notification/notification.service';

export class JobService extends BaseService {
  constructor(
    private jobRepository: JobRepository,
    private applicationRepository?: ApplicationRepository,
    private notificationService?: NotificationService
  ) {
    super();
  }

  async createJob(companyId: string, createdBy: string, data: any): Promise<Job> {
    const jobCode = await this.generateJobCode(companyId);

    // Check company settings for assignment mode
    // Ideally this should fetch company settings from CompanyService/Repo
    // Assuming defaults for now or logic to be injected
    const assignmentMode = data.assignmentMode || 'AUTO';

    const job = await this.jobRepository.create({
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

    return this.mapToResponse(job);
  }

  async updateJob(id: string, companyId: string, data: any) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');

    // Map fields for update
    // Note: In a real scenario, use a mapper or cleaner input object
    const updatedJob = await this.jobRepository.update(id, data);
    return this.mapToResponse(updatedJob);
  }

  async getJob(id: string, companyId: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    return this.mapToResponse(job);
  }

  async getCompanyJobs(companyId: string, filters: any) {
    const jobs = await this.jobRepository.findByCompanyIdWithFilters(companyId, filters);

    // Map database fields to API response format (camelCase)
    const mappedJobs = jobs.map(job => this.mapToResponse(job));

    // If ApplicationRepository is available, add application counts to each job
    if (this.applicationRepository) {
      const jobsWithCounts = await Promise.all(
        mappedJobs.map(async (job) => {
          const counts = await this.applicationRepository!.countByJobId(job.id);
          const unreadCounts = await this.applicationRepository!.countUnreadByJobId(job.id);

          return {
            ...job,
            totalApplications: counts,
            unreadApplicants: unreadCounts,
          };
        })
      );
      return jobsWithCounts;
    }

    return mappedJobs;
  }

  private mapToResponse(job: any): any {
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
      jobBoardDistribution: job.job_board_distribution,
      serviceType: job.service_type,
      serviceStatus: job.service_status,
      assignedConsultantId: job.assigned_consultant_id,
      assignedConsultantName: job.assigned_consultant_name,
      applicantsCount: job._count?.applications || 0,
    };
  }

  async deleteJob(id: string, companyId: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');

    return this.jobRepository.delete(id);
  }

  async bulkDeleteJobs(jobIds: string[], companyId: string): Promise<number> {
    if (!jobIds || jobIds.length === 0) {
      throw new HttpException(400, 'No job IDs provided');
    }

    // Verify all jobs belong to company
    const jobs = await this.jobRepository.findByCompanyId(companyId);
    const validJobIds = jobs.filter(job => jobIds.includes(job.id)).map(job => job.id);

    if (validJobIds.length === 0) {
      throw new HttpException(400, 'No valid jobs found for deletion');
    }

    const deletedCount = await this.jobRepository.bulkDelete(validJobIds, companyId);
    return deletedCount;
  }

  /**
   * Archive a job
   */
  async archiveJob(id: string, companyId: string, userId?: string): Promise<Job> {
    await this.getJob(id, companyId); // Verify ownership

    const updatedJob = await this.jobRepository.update(id, {
      archived: true,
      archived_at: new Date(),
      archived_by: userId,
    });

    return this.mapToResponse(updatedJob);
  }

  /**
   * Unarchive a job
   */
  async unarchiveJob(id: string, companyId: string): Promise<Job> {
    await this.getJob(id, companyId); // Verify ownership

    const updatedJob = await this.jobRepository.update(id, {
      archived: false,
      archived_at: null,
      archived_by: null,
    });

    return this.mapToResponse(updatedJob);
  }

  /**
   * Bulk archive jobs
   */
  async bulkArchiveJobs(jobIds: string[], companyId: string, userId?: string): Promise<number> {
    if (!jobIds || jobIds.length === 0) {
      throw new HttpException(400, 'No job IDs provided');
    }

    // Verify all jobs belong to company
    const jobs = await this.jobRepository.findByCompanyId(companyId);
    const validJobIds = jobs.filter(job => jobIds.includes(job.id)).map(job => job.id);

    if (validJobIds.length === 0) {
      throw new HttpException(400, 'No valid jobs found for archiving');
    }

    const result = await this.jobRepository.bulkArchive(validJobIds, companyId, userId);
    return result;
  }

  /**
   * Bulk unarchive jobs
   */
  async bulkUnarchiveJobs(jobIds: string[], companyId: string): Promise<number> {
    if (!jobIds || jobIds.length === 0) {
      throw new HttpException(400, 'No job IDs provided');
    }

    // Verify all jobs belong to company
    const jobs = await this.jobRepository.findByCompanyId(companyId);
    const validJobIds = jobs.filter(job => jobIds.includes(job.id)).map(job => job.id);

    if (validJobIds.length === 0) {
      throw new HttpException(400, 'No valid jobs found for unarchiving');
    }

    const result = await this.jobRepository.bulkUnarchive(validJobIds, companyId);
    return result;
  }

  async publishJob(id: string, companyId: string, userId?: string): Promise<Job> {
    const job = await this.getJob(id, companyId);

    // Idempotency: if already published, return success
    if (job.status === 'OPEN') {
      return job;
    }

    if (job.status !== 'DRAFT') {
      throw new HttpException(400, 'Only draft jobs can be published');
    }

    // TODO: Implement wallet payment logic here
    // For now, just change status to OPEN
    const updatedJob = await this.jobRepository.update(id, {
      status: 'OPEN',
      posting_date: new Date(),
    });

    // Trigger notification
    if (this.notificationService && userId) {
      await this.notificationService.createNotification({
        recipientType: NotificationRecipientType.USER,
        recipientId: userId,
        type: UniversalNotificationType.JOB_PUBLISHED,
        title: 'Job Published',
        message: `Your job "${updatedJob.title}" has been successfully published.`,
        data: { jobId: id, companyId },
        actionUrl: `/ats/jobs/${id}`
      });
    }

    return this.mapToResponse(updatedJob);
  }

  async saveDraft(id: string, companyId: string, data: any): Promise<Job> {
    await this.getJob(id, companyId); // Verify ownership

    const updatedJob = await this.jobRepository.update(id, {
      ...data,
      status: 'DRAFT',
    });

    return this.mapToResponse(updatedJob);
  }

  async saveTemplate(id: string, companyId: string, data: any): Promise<Job> {
    await this.getJob(id, companyId); // Verify ownership

    // For now, just mark the job as a template
    const updatedJob = await this.jobRepository.update(id, {
      ...data,
      saved_as_template: true,
    });

    return this.mapToResponse(updatedJob);
  }

  /**
   * Submit and activate a job (after review step)
   * This activates the job and makes it live on internal job board and careers page
   */
  async submitAndActivate(id: string, companyId: string, userId?: string, _paymentId?: string): Promise<Job> {
    const job = await this.getJob(id, companyId);

    // Idempotency: if already published, return success
    if (job.status === 'OPEN') {
      return job;
    }

    if (job.status !== 'DRAFT') {
      throw new HttpException(400, 'Only draft jobs can be submitted');
    }

    // TODO: Implement wallet payment verification here
    // For now, just activate the job

    // Generate share link and referral link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareLink = `${frontendUrl}/jobs/${id}`;
    const referralLink = `${shareLink}?ref=${id.substring(0, 8)}`;

    // Activate job - set status to OPEN and set posting date
    const updatedJob = await this.jobRepository.update(id, {
      status: 'OPEN',
      posting_date: job.postingDate || new Date(),
      share_link: shareLink,
      referral_link: referralLink,
    });

    // Trigger notification
    if (this.notificationService && userId) {
      await this.notificationService.createNotification({
        recipientType: NotificationRecipientType.USER,
        recipientId: userId,
        type: UniversalNotificationType.JOB_PUBLISHED,
        title: 'Job Published',
        message: `Your job "${updatedJob.title}" is now live and alerts have been sent to relevant candidates.`,
        data: { jobId: id, companyId, status: 'OPEN' },
        actionUrl: `/ats/jobs/${id}`
      });
    }

    return this.mapToResponse(updatedJob);
  }

  /**
   * Update job alerts configuration
   */
  async updateAlerts(
    id: string,
    companyId: string,
    alertsConfig: {
      newApplicants?: boolean;
      inactivity?: boolean;
      deadlines?: boolean;
      inactivityDays?: number;
    }
  ): Promise<Job> {
    await this.getJob(id, companyId); // Verify ownership

    const updatedJob = await this.jobRepository.update(id, {
      alerts_enabled: alertsConfig,
    });

    return this.mapToResponse(updatedJob);
  }

  /**
   * Save job as a named template
   * Note: Template name/description are returned in response but the schema
   * only supports a boolean saved_as_template flag. Consider adding dedicated
   * template fields to the schema for full template management.
   */
  async saveAsTemplate(
    id: string,
    companyId: string,
    templateName: string,
    templateDescription?: string
  ): Promise<{ job: any; templateId: string; templateName: string; templateDescription?: string }> {
    // Use parameter for unused variable lint
    void templateName;
    void templateDescription;

    const job = await this.getJob(id, companyId); // Verify ownership

    // Mark the job as a template (schema only has boolean flag)
    const updatedJob = await this.jobRepository.update(id, {
      saved_as_template: true,
    });

    return {
      job: this.mapToResponse(updatedJob),
      templateId: id,
      templateName,
      templateDescription,
    };
  }

  private async generateJobCode(companyId: string): Promise<string> {
    const count = await this.jobRepository.countByCompany(companyId);
    return `JOB-${String(count + 1).padStart(3, '0')}`;
  }
}
