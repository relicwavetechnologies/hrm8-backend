import { BaseService } from '../../core/service';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from '../application/application.repository';
import { Job, JobStatus, AssignmentMode, JobAssignmentMode, NotificationRecipientType, UniversalNotificationType, InvitationStatus } from '@prisma/client';
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

    // Process job alerts asynchronously (fire and forget)
    // This notifies candidates who have matching job alerts
    if (this.notificationService) {
      const emailService = new EmailService();
      const jobAlertService = new JobAlertService(this.notificationService, emailService);
      jobAlertService.processJobAlerts(updatedJob).catch(error => {
        console.error('[JobService] Failed to process job alerts:', error);
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

  private async generateJobCode(companyId: string): Promise<string> {
    const count = await this.jobRepository.countByCompany(companyId);
    return `JOB-${String(count + 1).padStart(3, '0')}`;
  }

  async inviteTeamMember(jobId: string, companyId: string, data: any): Promise<void> {
    const { email, name, role } = data;
    await this.getJob(jobId, companyId); // Verify access

    // Check if already in team
    const existingMember = await this.jobRepository.findTeamMemberByEmail(jobId, email);
    if (existingMember) {
      throw new HttpException(400, 'User is already in the hiring team');
    }

    // Check if user exists
    const user = await this.jobRepository.findUserByEmail(email);

    await this.jobRepository.addTeamMember(jobId, {
      email,
      name: name || user?.name,
      role,
      user_id: user?.id,
      status: 'ACTIVE', // Auto-activate for now if added by admin
    });

    // TODO: Send email invitation
  }

  async getTeamMembers(jobId: string, companyId: string) {
    await this.getJob(jobId, companyId);
    return this.jobRepository.getTeamMembers(jobId);
  }

  async removeTeamMember(jobId: string, memberId: string, companyId: string) {
    await this.getJob(jobId, companyId);
    // Ideally verify member belongs to job, but cascade delete handles cleanup if job deleted
    await this.jobRepository.removeTeamMember(memberId);
  }

  async updateTeamMemberRole(jobId: string, memberId: string, companyId: string, role: any) {
    await this.getJob(jobId, companyId);
    await this.jobRepository.updateTeamMember(memberId, { role });
  }

  async resendInvite(jobId: string, memberId: string, companyId: string) {
    await this.getJob(jobId, companyId);

    // Get member to verify exists and get details
    // Ideally we should have a getTeamMemberById method but we can just update blindly or fetch all
    // For now, let's update the invited_at timestamp to "resend"

    // Verify member exists (implicit in update)
    await this.jobRepository.updateTeamMember(memberId, {
      invited_at: new Date()
    });

    // TODO: Trigger actual email sending logic here
    // const member = await this.jobRepository.getTeamMember(memberId);
    // this.emailService.sendInvite(member.email, ...);
  }
}
