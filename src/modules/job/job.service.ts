import { BaseService } from '../../core/service';
import { JobRepository } from './job.repository';
import { JobRoundService } from './job-round.service';
import { ApplicationRepository } from '../application/application.repository';
import { Job, JobStatus, AssignmentMode, JobAssignmentMode, NotificationRecipientType, UniversalNotificationType, InvitationStatus } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';
import { emailService } from '../email/email.service';
import { SalaryBandService } from '../pricing/salary-band.service';
import { PriceBookSelectionService } from '../pricing/price-book-selection.service';
import { jobPaymentService, JobPaymentService } from './job-payment.service';
import { JobAlertService } from '../candidate/job-alert.service';
import { prisma } from '../../utils/prisma';
import { env } from '../../config/env';
import { jobAllocationService } from './job-allocation.service';
import { CommissionService } from '../hrm8/commission.service';
import { CommissionRepository } from '../hrm8/commission.repository';

export class JobService extends BaseService {
  constructor(
    private jobRepository: JobRepository,
    private applicationRepository?: ApplicationRepository,
    private notificationService?: NotificationService,
    private jobRoundService?: JobRoundService
  ) {
    super();
  }

  async createJob(companyId: string, createdBy: string, data: any): Promise<Job> {
    const jobCode = await this.generateJobCode(companyId);

    // Check company settings for assignment mode
    // Ideally this should fetch company settings from CompanyService/Repo
    // Assuming defaults for now or logic to be injected
    const assignmentMode = data.assignmentMode || 'AUTO';

    console.log('[JobService] createJob received data:', JSON.stringify(data, null, 2));

    // Determine if this should be published immediately
    const publishImmediately = data.publishImmediately !== false; // Default to true unless explicitly set to false
    const servicePackage = data.servicePackage || data.hiringMode || 'full-service';

    const jobPayload = {
      // Explicitly map all fields to ensure no data loss
      company: { connect: { id: companyId } },
      creator: { connect: { id: createdBy } },
      job_code: jobCode,
      status: publishImmediately ? 'OPEN' : 'DRAFT' as JobStatus, // ✅ Publish immediately
      assignment_mode: assignmentMode as AssignmentMode,

      title: data.title,
      description: data.description,
      department: data.department,
      location: data.location,

      hiring_mode: data.hiringMode,
      service_package: data.servicePackage || data.hiringMode?.toLowerCase().replace(/_/g, '-') || undefined,
      work_arrangement: (data.workArrangement?.toUpperCase().replace('-', '_')) || 'ON_SITE',
      employment_type: (data.employmentType?.toUpperCase().replace('-', '_')) || 'FULL_TIME',
      // experience_level: data.experienceLevel, // Removed: Not in schema

      number_of_vacancies: data.numberOfVacancies || 1,

      // Salary Fields
      salary_min: data.salaryMin,
      salary_max: data.salaryMax,
      salary_currency: data.salaryCurrency || 'USD',
      // salary_period: data.salaryPeriod, // Removed as per schema constraints
      salary_description: data.salaryDescription,
      // hide_salary: data.hideSalary, // Removed: Not in schema

      // Content Arrays
      requirements: data.requirements || [],
      responsibilities: data.responsibilities || [],
      promotional_tags: data.tags || data.promotionalTags || [], // Map tags to promotional_tags

      // Configs
      video_interviewing_enabled: data.videoInterviewingEnabled || false,
      application_form: data.applicationForm ? data.applicationForm : undefined,

      // Logistic
      close_date: data.closeDate,
      visibility: data.visibility || 'public',
      posting_date: publishImmediately ? new Date() : null, // ✅ Set posting date

      // Post-job setup flow (Simple vs Advanced)
      ...(data.setupType && { setup_type: data.setupType.toUpperCase() === 'SIMPLE' ? 'SIMPLE' : 'ADVANCED' }),
      ...(data.managementType && { management_type: data.managementType }),
    };

    console.log('[JobService] Transformed Payload:', JSON.stringify(jobPayload, null, 2));

    const job = await this.jobRepository.create(jobPayload as any);

    // Create default per-job roles for post-job setup (production-grade)
    await this.jobRepository.createJobRoles(job.id, [
      { name: 'Hiring Manager', isDefault: true },
      { name: 'Recruiter', isDefault: true },
      { name: 'Interviewer', isDefault: true },
    ]);
    
    // Process payment if publishing immediately
    if (publishImmediately && data.salaryMax && jobPaymentService) {
      try {
        // Calculate pricing
        const bandInfo = await SalaryBandService.determineJobBand(companyId, data.salaryMax);
        console.log('[JobService] Pricing calculated for job:', {
          jobId: job.id,
          isExecutiveSearch: bandInfo.isExecutiveSearch,
          band: bandInfo.band,
          price: bandInfo.price,
          currency: bandInfo.currency
        });
        
        // Process payment from wallet
        const paymentResult = await jobPaymentService.payForJobFromWallet(
          companyId,
          job.id,
          data.salaryMax,
          servicePackage,
          createdBy
        );
        
        if (paymentResult.success) {
          console.log('[JobService] ✅ Payment processed successfully for job:', job.id);
        } else {
          console.warn('[JobService] ⚠️  Payment failed, job created as DRAFT:', paymentResult.error);
          // Update job back to DRAFT if payment fails
          await this.jobRepository.update(job.id, { 
            status: 'DRAFT',
            posting_date: null
          });
        }
      } catch (error) {
        console.error('[JobService] Payment processing error:', error);
        // Update job back to DRAFT if payment fails
        await this.jobRepository.update(job.id, { 
          status: 'DRAFT',
          posting_date: null
        });
      }
    } else if (data.salaryMax && data.salaryMax > 0) {
      // Just calculate pricing for display (no payment)
      try {
        const bandInfo = await SalaryBandService.determineJobBand(companyId, data.salaryMax);
        console.log('[JobService] Pricing calculated (no payment):', {
          jobId: job.id,
          isExecutiveSearch: bandInfo.isExecutiveSearch,
          band: bandInfo.band,
          price: bandInfo.price,
          currency: bandInfo.currency
        });
      } catch (error) {
        console.warn('[JobService] Failed to calculate job pricing:', error);
      }
    }

    return this.mapToResponse(job);
  }

  async updateJob(id: string, companyId: string, data: any) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');

    // Map fields for update
    const updateData: any = {
      ...data,
      // Manual mapping for updates
      hiring_mode: data.hiringMode,
      service_package: data.servicePackage ?? (data.hiringMode ? data.hiringMode.toLowerCase().replace(/_/g, '-') : undefined),
      work_arrangement: data.workArrangement ? (data.workArrangement.toUpperCase().replace('-', '_')) : undefined,
      employment_type: data.employmentType ? (data.employmentType.toUpperCase().replace('-', '_')) : undefined,
      // experience_level: data.experienceLevel,
      number_of_vacancies: data.numberOfVacancies,
      salary_min: data.salaryMin,
      salary_max: data.salaryMax,
      salary_currency: data.salaryCurrency,
      // salary_period: data.salaryPeriod,
      salary_description: data.salaryDescription,
      // hide_salary: data.hideSalary,
      requirements: data.requirements,
      responsibilities: data.responsibilities,
      promotional_tags: data.tags || data.promotionalTags,
      application_form: data.applicationForm,
      close_date: data.closeDate,
      video_interviewing_enabled: data.videoInterviewingEnabled,
      setup_type: data.setupType ? data.setupType.toUpperCase() : undefined,
      management_type: data.managementType ?? undefined,
    };

    // Remove undefined and camelCase keys we mapped to snake_case (Prisma expects schema field names)
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
      if (key === 'setupType' || key === 'managementType') delete updateData[key];
    });

    const updatedJob = await this.jobRepository.update(id, updateData);

    // If switching to SIMPLE flow, ensure default rounds exist
    if (data.setupType === 'simple' || data.setupType === 'SIMPLE') {
      if (this.jobRoundService) {
        await this.jobRoundService.initializeSimpleRounds(id);
      }
    }

    return this.mapToResponse(updatedJob);
  }

  async getJob(id: string, companyId: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    return this.mapToResponse(job);
  }

  async resolveJobId(idOrCode: string, companyId: string): Promise<string> {
    let job = await this.jobRepository.findById(idOrCode);
    if (!job) {
      job = await this.jobRepository.findByJobCode(idOrCode);
    }
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    return job.id;
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

    // Return ONLY camelCase fields (no duplication)
    return {
      id: job.id,
      companyId: job.company_id,
      createdBy: job.created_by,
      jobCode: job.job_code,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      department: job.department,
      location: job.location,
      country: job.country,
      hiringMode: job.hiring_mode,
      workArrangement: job.work_arrangement,
      employmentType: job.employment_type,
      numberOfVacancies: job.number_of_vacancies,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryCurrency: job.salary_currency,
      salaryPeriod: job.salary_period,
      salaryDescription: job.salary_description,
      experienceLevel: job.experience_level,
      status: job.status,
      visibility: job.visibility,
      stealth: job.stealth,
      promotionalTags: job.promotional_tags,
      videoInterviewingEnabled: job.video_interviewing_enabled,
      assignmentMode: job.assignment_mode,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      postingDate: job.posting_date,
      closeDate: job.close_date,
      archived: job.archived,
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
      setupType: job.setup_type ? job.setup_type.toLowerCase() : 'advanced',
      managementType: job.management_type ?? undefined,
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

    // Derive servicePackage from service_package or hiring_mode (service_package often not persisted)
    const hiringModeToServicePackage: Record<string, string> = {
      SELF_MANAGED: 'self-managed',
      SHORTLISTING: 'shortlisting',
      FULL_SERVICE: 'full-service',
      EXECUTIVE_SEARCH: 'executive-search',
    };
    const servicePackage = job.service_package
      || hiringModeToServicePackage[job.hiring_mode || ''] || 'self-managed';

    // 1. Process payment if required
    if (JobPaymentService.requiresPayment(servicePackage) && job.payment_status !== 'PAID') {
      const paymentResult = await jobPaymentService.payForJobFromWallet(
        companyId,
        id,
        (job.salary_max ?? job.salary_min ?? 0) || 0,
        servicePackage,
        userId || job.created_by
      );

      if (!paymentResult.success) {
        throw new HttpException(402, paymentResult.error || 'Payment required to publish this job');
      }
    }

    // 2. Build update data
    const updateData: any = {
      status: 'OPEN',
      posting_date: new Date(),
    };

    // 3. Update job status
    const updatedJob = await this.jobRepository.update(id, updateData);

    // 4. Auto-allocate to consultant if applicable
    let assignedConsultantId: string | undefined;
    if (updatedJob.assignment_mode === 'AUTO' || updatedJob.hiring_mode !== 'SELF_MANAGED') {
      const assignResult = await jobAllocationService.autoAssignJob(id).catch(err => {
        console.error(`[JobService] Auto-allocation failed for job ${id}:`, err);
        return null;
      });
      assignedConsultantId = assignResult?.consultantId;
    }

    // 5. Auto-create PENDING commission when job was paid and consultant assigned
    if (updatedJob.payment_status === 'PAID' && assignedConsultantId) {
      try {
        const commissionService = new CommissionService(new CommissionRepository());
        await commissionService.requestCommission({
          consultantId: assignedConsultantId,
          type: 'RECRUITMENT_SERVICE',
          jobId: id,
          calculateFromJob: true,
          description: `Commission for job: ${updatedJob.title}`,
        });
        console.log(`[JobService] Created PENDING commission for consultant ${assignedConsultantId} on job ${id}`);
      } catch (err) {
        console.error(`[JobService] Failed to create commission for job ${id}:`, err);
      }
    }

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
      jobAlertService.processJobAlerts(updatedJob).catch((error: unknown) => {
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

  async submitAndActivate(id: string, companyId: string, userId: string, paymentId?: string): Promise<Job> {
    const job = await this.getJob(id, companyId);
    if (job.status !== 'DRAFT') {
      return job;
    }

    const updatedJob = await this.jobRepository.update(id, {
      status: 'OPEN',
      posting_date: new Date(),
      payment_status: paymentId ? 'PAID' : job.payment_status,
      stripe_payment_intent_id: paymentId || job.stripe_payment_intent_id,
    });

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

  async updateAlerts(id: string, companyId: string, alertsConfig: any): Promise<Job> {
    await this.getJob(id, companyId);
    const updatedJob = await this.jobRepository.update(id, {
      alerts_enabled: alertsConfig
    });
    return this.mapToResponse(updatedJob);
  }

  async saveAsTemplate(id: string, companyId: string, templateName: string, templateDescription?: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');

    const template = await prisma.jobTemplate.create({
      data: {
        company_id: companyId,
        created_by: job.created_by,
        name: templateName,
        description: templateDescription,
        source_job_id: job.id,
        job_data: job
      }
    });

    await this.jobRepository.update(id, {
      saved_as_template: true,
      template_id: template.id
    });

    return { job: this.mapToResponse(job), templateId: template.id };
  }

  private async generateJobCode(companyId: string): Promise<string> {
    const count = await this.jobRepository.countByCompany(companyId);
    return `JOB-${String(count + 1).padStart(3, '0')}`;
  }

  async inviteTeamMember(jobId: string, companyId: string, data: any): Promise<void> {
    const { email, name, role, roles: roleIds, inviterId } = data;
    await this.getJob(jobId, companyId); // Verify access

    // Check if already in team
    const existingMember = await this.jobRepository.findTeamMemberByEmail(jobId, email);
    if (existingMember) {
      throw new HttpException(400, 'User is already in the hiring team');
    }

    // Check if user exists
    const user = await this.jobRepository.findUserByEmail(email);

    const ids = Array.isArray(roleIds) ? roleIds : (role ? [] : []);
    await this.jobRepository.addTeamMember(jobId, {
      email,
      name: name || user?.name,
      role: role || 'MEMBER',
      user_id: user?.id,
      status: 'ACTIVE',
      roleIds: ids,
    });

    // Send hiring team invitation email (non-blocking)
    this.sendHiringTeamInvitationEmail(jobId, companyId, {
      to: email,
      role: role || 'MEMBER',
      inviterId,
    }).catch((err) => console.error('[JobService] Failed to send hiring team invitation email', err));
  }

  /**
   * Sends hiring team invitation email. Does not throw; logs errors.
   */
  private async sendHiringTeamInvitationEmail(
    jobId: string,
    companyId: string,
    opts: { to: string; role: string; inviterId?: string }
  ): Promise<void> {
    const jobWithCompany = await prisma.job.findUnique({
      where: { id: jobId },
      select: { title: true, company_id: true, company: { select: { name: true } } },
    });
    if (!jobWithCompany || jobWithCompany.company_id !== companyId) return;

    const jobTitle = jobWithCompany.title ?? 'Job';
    const companyName = jobWithCompany.company?.name ?? 'Company';
    let inviterName = 'A colleague';
    if (opts.inviterId) {
      const inviter = await prisma.user.findUnique({
        where: { id: opts.inviterId },
        select: { name: true, email: true },
      });
      if (inviter?.name) inviterName = inviter.name;
      else if (inviter?.email) inviterName = inviter.email;
    }

    const inviteLink = `${env.FRONTEND_URL}/jobs/${jobId}`;
    await emailService.sendHiringTeamInvitation({
      to: opts.to,
      inviterName,
      jobTitle,
      companyName,
      role: opts.role,
      inviteLink,
    });
  }

  async getJobRoles(jobId: string, companyId: string) {
    await this.getJob(jobId, companyId);
    const roles = await this.jobRepository.getJobRoles(jobId);
    return roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      isDefault: r.is_default,
    }));
  }

  async createJobRole(jobId: string, companyId: string, data: { name: string; isDefault?: boolean }) {
    await this.getJob(jobId, companyId);
    if (!data.name?.trim()) throw new HttpException(400, 'Role name is required');
    const role = await this.jobRepository.createJobRole(jobId, {
      name: data.name.trim(),
      isDefault: data.isDefault ?? false,
    });
    return { id: role.id, name: role.name, isDefault: role.is_default };
  }

  async getTeamMembers(jobId: string, companyId: string) {
    await this.getJob(jobId, companyId);
    const rows = await this.jobRepository.getTeamMembers(jobId);
    return rows.map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      email: m.email,
      name: m.name,
      role: m.role,
      status: m.status,
      invitedAt: m.invited_at,
      joinedAt: m.joined_at,
      roles: (m.member_roles || []).map((mr: any) => mr.job_role?.id ?? mr.job_role_id).filter(Boolean),
      roleDetails: (m.member_roles || []).map((mr: any) => mr.job_role ? { id: mr.job_role.id, name: mr.job_role.name } : null).filter(Boolean),
    }));
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

  async updateTeamMemberRoles(jobId: string, memberId: string, companyId: string, roleIds: string[]) {
    await this.getJob(jobId, companyId);
    await this.jobRepository.setMemberJobRoles(memberId, roleIds ?? []);
  }

  async resendInvite(jobId: string, memberId: string, companyId: string, inviterId?: string) {
    await this.getJob(jobId, companyId);

    const member = await this.jobRepository.getTeamMember(memberId);
    if (!member || member.job_id !== jobId) throw new HttpException(404, 'Team member not found');

    await this.jobRepository.updateTeamMember(memberId, {
      invited_at: new Date(),
    });

    this.sendHiringTeamInvitationEmail(jobId, companyId, {
      to: member.email,
      role: member.role ?? 'MEMBER',
      inviterId,
    }).catch((err) => console.error('[JobService] Failed to resend hiring team invitation email', err));
  }
}
