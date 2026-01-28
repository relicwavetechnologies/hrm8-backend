import { BaseService } from '../../core/service';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from '../application/application.repository';
import { Job, JobStatus, AssignmentMode, JobAssignmentMode, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { NotificationService } from '../notification/notification.service';
import { JobPaymentService } from '../payment/job-payment.service';
import { jobAllocationService } from '../hrm8/job-allocation.service';
import { jobDescriptionGeneratorService } from '../ai/job-description-generator.service';

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
      title: data.title,
      description: data.description,
      job_summary: data.jobSummary,
      category: data.category,
      number_of_vacancies: data.numberOfVacancies || 1,
      department: data.department,
      location: data.location,
      employment_type: data.employmentType,
      work_arrangement: data.workArrangement,
      salary_min: data.salaryMin,
      salary_max: data.salaryMax,
      salary_currency: data.salaryCurrency || 'USD',
      salary_description: data.salaryDescription,
      stealth: data.stealth,
      visibility: data.visibility,
      requirements: data.requirements,
      responsibilities: data.responsibilities,
      hiring_mode: data.hiringMode,
      promotional_tags: data.promotionalTags || [],
      terms_accepted: data.termsAccepted,
      terms_accepted_at: data.termsAcceptedAt ? new Date(data.termsAcceptedAt) : null,
      terms_accepted_by: data.termsAcceptedBy,
      hiring_team: data.hiringTeam,
      application_form: data.applicationForm,
      video_interviewing_enabled: data.videoInterviewingEnabled || false,
      assignment_mode: assignmentMode,
      service_package: data.servicePackage || 'self-managed',
      company: { connect: { id: companyId } },
      creator: { connect: { id: createdBy } },
      job_code: jobCode,
      status: 'DRAFT',
    });

    return this.mapToResponse(job);
  }

  async updateJob(id: string, companyId: string, data: any) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.jobSummary !== undefined) updateData.job_summary = data.jobSummary;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.numberOfVacancies !== undefined) updateData.number_of_vacancies = data.numberOfVacancies;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.employmentType !== undefined) updateData.employment_type = data.employmentType;
    if (data.workArrangement !== undefined) updateData.work_arrangement = data.workArrangement;
    if (data.salaryMin !== undefined) updateData.salary_min = data.salaryMin;
    if (data.salaryMax !== undefined) updateData.salary_max = data.salaryMax;
    if (data.salaryCurrency !== undefined) updateData.salary_currency = data.salaryCurrency;
    if (data.salaryDescription !== undefined) updateData.salary_description = data.salaryDescription;
    if (data.stealth !== undefined) updateData.stealth = data.stealth;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.responsibilities !== undefined) updateData.responsibilities = data.responsibilities;
    if (data.hiringMode !== undefined) updateData.hiring_mode = data.hiringMode;
    if (data.promotionalTags !== undefined) updateData.promotional_tags = data.promotionalTags;
    if (data.termsAccepted !== undefined) updateData.terms_accepted = data.termsAccepted;
    if (data.termsAcceptedAt !== undefined) updateData.terms_accepted_at = data.termsAcceptedAt ? new Date(data.termsAcceptedAt) : null;
    if (data.termsAcceptedBy !== undefined) updateData.terms_accepted_by = data.termsAcceptedBy;
    if (data.hiringTeam !== undefined) updateData.hiring_team = data.hiringTeam;
    if (data.applicationForm !== undefined) updateData.application_form = data.applicationForm;
    if (data.videoInterviewingEnabled !== undefined) updateData.video_interviewing_enabled = data.videoInterviewingEnabled;
    if (data.assignmentMode !== undefined) updateData.assignment_mode = data.assignmentMode;
    if (data.servicePackage !== undefined) updateData.service_package = data.servicePackage;
    if (data.status !== undefined) updateData.status = data.status;

    const updatedJob = await this.jobRepository.update(id, updateData);
    return this.mapToResponse(updatedJob);
  }

  async getJob(id: string, companyId: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    return this.mapToResponse(job);
  }

  async getCompanyJobs(companyId: string, filters: any) {
    const { jobs, total } = await this.jobRepository.findByCompanyIdWithFilters(companyId, filters);

    // Map database fields to API response format (camelCase)
    const mappedJobs = jobs.map(job => this.mapToResponse(job));

    // If ApplicationRepository is available, add application counts to each job
    if (this.applicationRepository) {
      try {
        const jobsWithCounts = await Promise.all(
          mappedJobs.map(async (job) => {
            try {
              const counts = await this.applicationRepository!.countByJobId(job.id);
              const unreadCounts = await this.applicationRepository!.countUnreadByJobId(job.id);

              return {
                ...job,
                totalApplications: counts,
                unreadApplicants: unreadCounts,
              };
            } catch (error) {
              // If counting fails for individual job, return job with zero counts
              console.warn(`[JobService] Failed to count applications for job ${job.id}:`, error);
              return {
                ...job,
                totalApplications: 0,
                unreadApplicants: 0,
              };
            }
          })
        );
        return { jobs: jobsWithCounts, total, page: filters.page || 1, limit: filters.limit || 50 };
      } catch (error) {
        // If application counting fails entirely, log warning and return jobs without counts
        return {
          jobs: mappedJobs.map(job => ({ ...job, totalApplications: 0, unreadApplicants: 0 })),
          total,
          page: filters.page || 1,
          limit: filters.limit || 50
        };
      }
    }

    const result = { jobs: mappedJobs, total, page: filters.page || 1, limit: filters.limit || 50 };
    return result;
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
      servicePackage: job.service_package,
      paymentStatus: job.payment_status,
      assignedConsultantId: job.assigned_consultant_id,
      assignedConsultantName: job.assigned_consultant_name,
      applicantsCount: job._count?.applications || 0,
      jobTargetChannels: job.job_target_channels,
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

  async bulkArchiveJobs(jobIds: string[], companyId: string, userId: string): Promise<number> {
    if (!jobIds || jobIds.length === 0) throw new HttpException(400, 'No job IDs provided');
    return this.jobRepository.bulkArchive(jobIds, companyId, userId);
  }

  async bulkUnarchiveJobs(jobIds: string[], companyId: string): Promise<number> {
    if (!jobIds || jobIds.length === 0) throw new HttpException(400, 'No job IDs provided');
    return this.jobRepository.bulkUnarchive(jobIds, companyId);
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

    // Process payment before publishing
    try {
      await new JobPaymentService().processJobPayment(id, companyId, userId);
    } catch (paymentError: any) {
      // Handle payment errors with proper error messages
      const errorMessage = paymentError.message || 'Payment processing failed';

      // Send notification if payment fails
      if (this.notificationService && userId) {
        await this.notificationService.createNotification({
          recipientType: NotificationRecipientType.USER,
          recipientId: userId,
          type: UniversalNotificationType.JOB_PUBLISHED,
          title: 'Job Publication Failed',
          message: `Unable to publish job "${job.title}". ${errorMessage}. Please recharge your wallet and try again.`,
          data: { jobId: id, companyId, error: errorMessage },
          actionUrl: `/ats/jobs/${id}`
        });
      }

      throw paymentError;
    }

    const updatedJob = await this.jobRepository.update(id, {
      status: 'OPEN',
      posting_date: new Date(),
    });

    // Trigger success notification
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

    // Auto-assignment
    await jobAllocationService.autoAssignJob(id);

    return this.mapToResponse(updatedJob);
  }

  async saveDraft(id: string, companyId: string, data: any): Promise<Job> {
    await this.getJob(id, companyId); // Verify ownership

    const updatedJob = await this.updateJob(id, companyId, {
      ...data,
      status: 'DRAFT',
    });

    return this.mapToResponse(updatedJob);
  }

  async saveTemplate(id: string, companyId: string, data: any): Promise<Job> {
    await this.getJob(id, companyId); // Verify ownership

    // For now, just mark the job as a template
    const updatedJob = await this.updateJob(id, companyId, {
      ...data,
      savedAsTemplate: true,
    });

    return this.mapToResponse(updatedJob);
  }

  async submitAndActivate(id: string, companyId: string, userId?: string): Promise<Job> {
    // This is essentially the same as publishJob, but usually triggered at the end of a wizard
    return this.publishJob(id, companyId, userId);
  }

  async updateAlerts(id: string, companyId: string, alerts: any): Promise<Job> {
    await this.getJob(id, companyId);
    const updatedJob = await this.jobRepository.update(id, {
      alerts_enabled: alerts,
    });
    return this.mapToResponse(updatedJob);
  }

  async generateDescription(data: any): Promise<{ description: string; requirements: string[]; responsibilities: string[] }> {
    return jobDescriptionGeneratorService.generateWithAI(data);
  }

  async inviteHiringTeamMember(id: string, companyId: string, userId: string, data: any) {
    const job = await this.getJob(id, companyId);
    const currentTeam = (job.hiringTeam as any[]) || [];
    const memberExists = currentTeam.some((m: any) => m.email === data.email);

    if (memberExists) {
      throw new HttpException(400, 'User already invited to hiring team');
    }

    const updatedTeam = [...currentTeam, {
      email: data.email,
      role: data.role || 'INTERVIEWER',
      invitedAt: new Date().toISOString(),
      invitedBy: userId
    }];

    const updatedJob = await this.jobRepository.update(id, {
      hiring_team: updatedTeam,
    });

    // Trigger notification if notification service is available
    if (this.notificationService) {
      await this.notificationService.createNotification({
        recipientType: NotificationRecipientType.USER,
        recipientId: userId, // Current user is the sender
        type: UniversalNotificationType.INVITATION_SENT,
        title: 'Hiring Team Invitation',
        message: `Hiring team invitation sent to ${data.email} for "${job.title}".`,
        data: { jobId: id, role: data.role, invitedEmail: data.email },
        actionUrl: `/ats/jobs/${id}`
      });
    }

    return this.mapToResponse(updatedJob);
  }

  async cloneJob(id: string, companyId: string, userId: string): Promise<Job> {
    const job = await this.getJob(id, companyId);
    if (!job) throw new HttpException(404, 'Job not found');

    const jobCode = await this.generateJobCode(companyId);

    // Create a new job with data from the existing job
    // Reset status to DRAFT, new dates, new creator
    const clonedJob = await this.jobRepository.create({
      title: `${job.title} (Copy)`,
      description: job.description,
      job_summary: job.jobSummary,
      category: job.category,
      number_of_vacancies: job.numberOfVacancies,
      department: job.department,
      location: job.location,
      employment_type: job.employmentType,
      work_arrangement: job.workArrangement,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      salary_currency: job.salaryCurrency,
      salary_description: job.salaryDescription,
      stealth: job.stealth,
      visibility: job.visibility,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      hiring_mode: job.hiringMode,
      promotional_tags: job.promotionalTags,
      hiring_team: job.hiringTeam, // Copy team or reset? Usually copy
      application_form: job.applicationForm,
      video_interviewing_enabled: job.videoInterviewingEnabled,
      assignment_mode: job.assignmentMode,
      service_package: job.servicePackage,
      company: { connect: { id: companyId } },
      creator: { connect: { id: userId } },
      job_code: jobCode,
      status: 'DRAFT',
    });

    return this.mapToResponse(clonedJob);
  }

  async closeJob(id: string, companyId: string, userId: string): Promise<Job> {
    const job = await this.getJob(id, companyId);
    if (job.status === 'CLOSED') return job;

    const updatedJob = await this.jobRepository.update(id, {
      status: 'CLOSED',
      close_date: new Date(),
    });

    // Log activity if log service exists (omitted for brevity)
    return this.mapToResponse(updatedJob);
  }

  async archiveJob(id: string, companyId: string, userId: string): Promise<Job> {
    const job = await this.getJob(id, companyId);

    const updatedJob = await this.jobRepository.update(id, {
      archived: true,
      archived_at: new Date(),
      archived_by: userId
    });

    return this.mapToResponse(updatedJob);
  }

  async unarchiveJob(id: string, companyId: string): Promise<Job> {
    const job = await this.getJob(id, companyId);

    const updatedJob = await this.jobRepository.update(id, {
      archived: false,
      archived_at: null,
      archived_by: null
    });

    return this.mapToResponse(updatedJob);
  }

  async getHiringTeam(id: string, companyId: string) {
    const job = await this.getJob(id, companyId);
    return job.hiringTeam || [];
  }

  async removeHiringTeamMember(id: string, companyId: string, memberEmail: string) {
    const job = await this.getJob(id, companyId);
    const currentTeam = (job.hiringTeam as any[]) || [];

    const updatedTeam = currentTeam.filter((m: any) => m.email !== memberEmail);

    if (currentTeam.length === updatedTeam.length) {
      // Member not found, potentially throw error or just return
      return this.mapToResponse(job);
    }

    const updatedJob = await this.jobRepository.update(id, {
      hiring_team: updatedTeam
    });

    return this.mapToResponse(updatedJob);
  }

  async getJobActivities(id: string, companyId: string) {
    await this.getJob(id, companyId); // Verify access
    return this.jobRepository.findActivities(id);
  }
  private async generateJobCode(companyId: string): Promise<string> {
    const count = await this.jobRepository.countByCompany(companyId);
    return `JOB-${String(count + 1).padStart(3, '0')}`;

  }

  async validateJob(data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!data.title) errors.push('Title is required');
    if (!data.department) errors.push('Department is required');
    if (!data.location) errors.push('Location is required');
    if (!data.employmentType) errors.push('Employment Type is required');

    // Add more validation logic as needed

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getDistributionChannels(id: string, companyId: string) {
    const job = await this.getJob(id, companyId);
    return {
      jobId: id,
      channels: job.jobTargetChannels || [] // mapping from prisma snake_case might be handled in getJob or need direct access
    };
  }

  async updateDistributionChannels(id: string, companyId: string, channels: string[]) {
    await this.getJob(id, companyId);

    const updatedJob = await this.jobRepository.update(id, {
      job_target_channels: channels, // Using the schema field we found
    });

    return this.mapToResponse(updatedJob);
  }
}
