import { BaseService } from '../../core/service';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from '../application/application.repository';
import { Job, JobStatus, AssignmentMode, JobAssignmentMode, NotificationRecipientType, UniversalNotificationType, InvitationStatus } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { NotificationService } from '../notification/notification.service';
import { prisma } from '../../utils/prisma';
import { emailService } from '../email/email.service';
import crypto from 'crypto';
import { env } from '../../config/env';

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

  async inviteTeamMember(jobId: string, companyId: string, data: { email: string; name: string; role: string; permissions?: any }) {
    // 0. Validate Input
    if (!['admin', 'member'].includes(data.role)) {
      throw new HttpException(400, 'Invalid role. Must be admin or member.');
    }

    // 1. Validate Job ownership
    const job = await this.getJob(jobId, companyId);
    if (!job) throw new HttpException(404, 'Job not found');

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // 3. Prepare Member Data (Persist to Job)
    const isRegistered = !!existingUser;
    const status = isRegistered ? 'active' : 'pending_invite';
    const userId = existingUser ? existingUser.id : `pending_user_${Date.now()}`;

    // Default permissions if not provided
    const permissions = data.permissions || {
      canViewApplications: true,
      canShortlist: data.role === 'admin',
      canScheduleInterviews: true,
      canMakeOffers: data.role === 'admin',
    };

    const newMember = {
      id: `member_${Date.now()}`,
      userId,
      name: data.name,
      email: data.email,
      role: data.role,
      permissions,
      status,
      addedAt: new Date().toISOString(),
      invitedAt: new Date().toISOString()
    };

    // Update Job's hiring_team array
    const jobRecord = await prisma.job.findUnique({ where: { id: jobId } });
    let currentTeam: any[] = [];
    if (jobRecord?.hiring_team && Array.isArray(jobRecord.hiring_team)) {
      currentTeam = jobRecord.hiring_team as any[];
    }

    // Check duplicate email to update or append
    const existingMemberIndex = currentTeam.findIndex((m: any) => m.email === data.email);

    if (existingMemberIndex >= 0) {
      currentTeam[existingMemberIndex] = { ...currentTeam[existingMemberIndex], ...newMember, id: currentTeam[existingMemberIndex].id };
    } else {
      currentTeam.push(newMember);
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { hiring_team: currentTeam }
    });

    if (existingUser) {
      // User exists and is now added/updated in the team.
      return true;
    }

    // 3. User does not exist, check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: data.email,
        company_id: companyId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      // Resend invitation email
      // Get inviter name
      const inviter = await prisma.user.findFirst({ where: { company_id: companyId } }); // Fallback

      const inviteLink = `${env.FRONTEND_URL || 'http://localhost:3000'}/auth/accept-invite?token=${existingInvitation.token}`;

      await emailService.sendHiringTeamInvitation({
        to: data.email,
        inviterName: inviter?.name || 'Admin',
        jobTitle: job.title,
        companyName: job.company?.name || 'Company',
        role: data.role,
        inviteLink,
      });
      return true;
    }

    // 4. Create new invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // We need an inviter ID. 
    const inviterId = job.createdBy;

    // Create invitation record
    try {
      await prisma.invitation.create({
        data: {
          company_id: companyId,
          invited_by: inviterId,
          email: data.email,
          token,
          status: InvitationStatus.PENDING,
          expires_at: expiresAt,
        },
      });
    } catch (e) {
      console.error('Failed to create invitation', e);
      throw new HttpException(500, 'Failed to create invitation');
    }

    // 5. Send Email
    const jobWithCompany = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true, creator: true }
    });

    const inviteLink = `${env.FRONTEND_URL || 'http://localhost:3000'}/auth/accept-invite?token=${token}`;

    await emailService.sendHiringTeamInvitation({
      to: data.email,
      inviterName: jobWithCompany?.creator?.name || 'Hiring Team',
      jobTitle: job.title,
      companyName: jobWithCompany?.company?.name || 'Company',
      role: data.role,
      inviteLink,
    }); /*End of invite logic*/

    return true;
  }

  private async generateJobCode(companyId: string): Promise<string> {
    const count = await this.jobRepository.countByCompany(companyId);
    return `JOB-${String(count + 1).padStart(3, '0')}`;
  }
}
