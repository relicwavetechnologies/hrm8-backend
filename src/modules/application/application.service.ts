import { BaseService } from '../../core/service';
import { ApplicationRepository } from './application.repository';
import { Prisma, Application, ApplicationStatus, ApplicationStage, ApplicationRoundProgress, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { HttpException } from '../../core/http-exception';
import { SubmitApplicationRequest, ApplicationFilters, AnonymousApplicationRequest } from './application.model';
import { CandidateRepository } from '../candidate/candidate.repository';
import { CandidateService } from '../candidate/candidate.service';
import { JobRepository } from '../job/job.repository';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentRepository } from '../assessment/assessment.repository';

export class ApplicationService extends BaseService {
  private assessmentService: AssessmentService;
  private notificationService: NotificationService;

  constructor(
    private applicationRepository: ApplicationRepository,
    notificationService?: NotificationService
  ) {
    super();
    this.notificationService = notificationService || new NotificationService(new (require('../notification/notification.repository').NotificationRepository)());
    this.assessmentService = new AssessmentService(new AssessmentRepository());
  }

  async submitApplication(data: SubmitApplicationRequest): Promise<Application> {
    // Check if candidate has already applied
    const hasApplied = await this.applicationRepository.checkExistingApplication(
      data.candidateId,
      data.jobId
    );

    if (hasApplied) {
      throw new HttpException(400, 'You have already applied to this job');
    }

    // Create the application
    const application = await this.applicationRepository.create({
      candidate: { connect: { id: data.candidateId } },
      job: { connect: { id: data.jobId } },
      status: 'NEW',
      stage: 'NEW_APPLICATION',
      applied_date: new Date(),
      resume_url: data.resumeUrl,
      cover_letter_url: data.coverLetterUrl,
      portfolio_url: data.portfolioUrl,
      linked_in_url: data.linkedInUrl,
      website_url: data.websiteUrl,
      custom_answers: data.customAnswers || [],
      questionnaire_data: data.questionnaireData,
      is_read: false,
      is_new: true,
      tags: [],
      shortlisted: false,
      manually_added: false,
    });

    // Notify Recruiter
    try {
      const appWithDetails = await this.applicationRepository.findById(application.id) as any;
      if (appWithDetails && appWithDetails.job?.created_by) {
        await this.notificationService.createNotification({
          recipientType: NotificationRecipientType.USER,
          recipientId: appWithDetails.job.created_by,
          type: UniversalNotificationType.NEW_APPLICATION,
          title: `New Application: ${appWithDetails.job.title}`,
          message: `${appWithDetails.candidate.first_name} ${appWithDetails.candidate.last_name} has applied for ${appWithDetails.job.title}.`,
          actionUrl: `/ats/jobs/${appWithDetails.job_id}/applications/${application.id}`,
          data: { applicationId: application.id, candidateName: `${appWithDetails.candidate.first_name} ${appWithDetails.candidate.last_name}` }
        });
      }

      // Notify Candidate
      if (appWithDetails && appWithDetails.candidate) {
        // 1. In-App Notification
        await this.notificationService.createNotification({
          recipientType: NotificationRecipientType.CANDIDATE,
          recipientId: appWithDetails.candidate.id,
          type: UniversalNotificationType.APPLICATION_STATUS_CHANGED, // Or a more specific type if added to enum
          title: 'Application Received!',
          message: `Your application for ${appWithDetails.job.title} at ${appWithDetails.job.company?.name || 'the company'} has been successfully submitted.`,
          actionUrl: '/candidate/applications',
          skipEmail: true,
          data: { applicationId: application.id, jobId: appWithDetails.job_id }
        });

        // 2. Email Notification
        const { emailService } = await import('../email/email.service');
        await emailService.sendApplicationSubmissionEmail({
          to: appWithDetails.candidate.email,
          candidateName: `${appWithDetails.candidate.first_name} ${appWithDetails.candidate.last_name}`,
          jobTitle: appWithDetails.job.title,
          companyName: appWithDetails.job.company?.name || 'the company',
          applicationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate/applications`
        });
      }
    } catch (error) {
      console.error('[ApplicationService] Failed to notify of new application:', error);
    }

    return this.mapToResponse(application);
  }

  async getApplication(id: string): Promise<Application | null> {
    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.mapToResponse(application);
  }

  async getCandidateApplications(candidateId: string): Promise<Application[]> {
    const applications = await this.applicationRepository.findByCandidateId(candidateId);
    return applications.map(app => this.mapToResponse(app));
  }

  async getJobApplications(jobId: string, filters?: ApplicationFilters): Promise<Application[]> {
    const applications = await this.applicationRepository.findByJobId(jobId, filters);
    return applications.map(app => this.mapToResponse(app));
  }

  async updateScore(id: string, score: number): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    const updated = await this.applicationRepository.updateScore(id, score);
    return this.mapToResponse(updated);
  }

  async updateRank(id: string, rank: number): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    const updated = await this.applicationRepository.updateRank(id, rank);
    return this.mapToResponse(updated);
  }

  async updateTags(id: string, tags: string[]): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    const updated = await this.applicationRepository.updateTags(id, tags);
    return this.mapToResponse(updated);
  }

  async shortlistCandidate(id: string, userId: string): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    const updated = await this.applicationRepository.shortlist(id, userId);

    // Notify Candidate (In-App)
    try {
      const appWithDetails = await this.applicationRepository.findById(id) as any;
      if (appWithDetails && appWithDetails.candidate_id) {
        await this.notificationService.createNotification({
          recipientType: NotificationRecipientType.CANDIDATE,
          recipientId: appWithDetails.candidate_id,
          type: UniversalNotificationType.APPLICATION_STATUS_CHANGED,
          title: "You've Been Shortlisted!",
          message: `Your application for ${appWithDetails.job?.title || 'the position'} has been shortlisted.`,
          actionUrl: '/candidate/applications',
          data: { applicationId: id, jobId: appWithDetails.job_id }
        });
      }
    } catch (error) {
      console.error('[ApplicationService] Failed to send shortlist notification:', error);
    }

    return this.mapToResponse(updated);
  }

  async unshortlistCandidate(id: string): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    const updated = await this.applicationRepository.unshortlist(id);
    return this.mapToResponse(updated);
  }

  async updateStage(id: string, stage: ApplicationStage): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    const updated = await this.applicationRepository.updateStage(id, stage);

    // Notify Candidate and Recruiter
    try {
      const appWithDetails = await this.applicationRepository.findById(id) as any;
      if (appWithDetails && appWithDetails.candidate_id) {
        // Notify Candidate
        const isRejected = stage === 'REJECTED';
        const title = isRejected ? 'Application Update' : 'Application Progress Update';
        const message = isRejected
          ? `We regret to inform you that your application for ${appWithDetails.job?.title} at ${appWithDetails.job?.company?.name || 'the company'} was not successful at this time.`
          : `Your application for ${appWithDetails.job?.title} has moved to the "${stage.replace(/_/g, ' ')}" stage.`;

        await this.notificationService.createNotification({
          recipientType: NotificationRecipientType.CANDIDATE,
          recipientId: appWithDetails.candidate_id,
          type: isRejected ? UniversalNotificationType.APPLICATION_REJECTED : UniversalNotificationType.APPLICATION_STATUS_CHANGED,
          title,
          message,
          actionUrl: '/candidate/applications',
          data: { applicationId: id, jobId: appWithDetails.job_id, stage }
        });

        // Notify Recruiter (Job Owner)
        if (appWithDetails.job?.created_by) {
          await this.notificationService.createNotification({
            recipientType: NotificationRecipientType.USER,
            recipientId: appWithDetails.job.created_by,
            type: UniversalNotificationType.APPLICATION_STATUS_CHANGED,
            title: 'Application Stage Updated',
            message: `Application for ${appWithDetails.candidate.first_name} ${appWithDetails.candidate.last_name} has moved to "${stage.replace(/_/g, ' ')}".`,
            actionUrl: `/ats/jobs/${appWithDetails.job_id}/applications/${id}`,
            data: { applicationId: id, candidateName: `${appWithDetails.candidate.first_name} ${appWithDetails.candidate.last_name}` }
          });
        }
      }
    } catch (error: any) {
      console.error('[ApplicationService] Failed to send stage change notifications:', error);
    }

    return this.mapToResponse(updated);
  }

  async updateNotes(id: string, notes: string): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    const updated = await this.applicationRepository.updateNotes(id, notes);
    return this.mapToResponse(updated);
  }

  async withdrawApplication(id: string, candidateId: string): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    // Verify the application belongs to the candidate
    if (application.candidate_id !== candidateId) {
      throw new HttpException(403, 'Unauthorized to withdraw this application');
    }

    const updated = await this.applicationRepository.update(id, {
      status: 'WITHDRAWN',
    });

    // Notify Recruiter
    try {
      const appWithDetails = await this.applicationRepository.findById(id) as any;
      if (appWithDetails && appWithDetails.job?.created_by) {
        await this.notificationService.createNotification({
          recipientType: NotificationRecipientType.USER,
          recipientId: appWithDetails.job.created_by,
          type: UniversalNotificationType.APPLICATION_STATUS_CHANGED,
          title: 'Application Withdrawn',
          message: `${appWithDetails.candidate.first_name} ${appWithDetails.candidate.last_name} has withdrawn their application for ${appWithDetails.job.title}.`,
          actionUrl: `/ats/jobs/${appWithDetails.job_id}/applications/${id}`,
          data: { applicationId: id, candidateName: `${appWithDetails.candidate.first_name} ${appWithDetails.candidate.last_name}` }
        });
      }
    } catch (error: any) {
      console.error('[ApplicationService] Failed to send withdrawal notification to recruiter:', error);
    }

    return this.mapToResponse(updated);
  }

  async deleteApplication(id: string, candidateId: string): Promise<void> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    // Verify the application belongs to the candidate
    if (application.candidate_id !== candidateId) {
      throw new HttpException(403, 'Unauthorized to delete this application');
    }

    await this.applicationRepository.delete(id);
  }

  async markAsRead(id: string): Promise<Application> {
    const updated = await this.applicationRepository.markAsRead(id);
    return this.mapToResponse(updated);
  }

  async bulkScoreCandidates(applicationIds: string[], scores: Record<string, number>): Promise<number> {
    return this.applicationRepository.bulkUpdateScore(applicationIds, scores);
  }

  async getApplicationCountForJob(jobId: string): Promise<{ total: number; unread: number }> {
    const [total, unread] = await Promise.all([
      this.applicationRepository.countByJobId(jobId),
      this.applicationRepository.countUnreadByJobId(jobId),
    ]);

    return { total, unread };
  }

  async checkApplication(candidateId: string, jobId: string): Promise<boolean> {
    return this.applicationRepository.checkExistingApplication(candidateId, jobId);
  }

  async submitAnonymousApplication(data: AnonymousApplicationRequest): Promise<Application> {
    const candidateRepository = new CandidateRepository();
    const candidateService = new CandidateService(candidateRepository);

    // Register candidate (this will fail if email exists)
    const candidate = await candidateService.register({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password || Math.random().toString(36).slice(-8), // Generate a random password if none provided
      phone: data.phone,
    });

    const application = await this.submitApplication({
      candidateId: candidate.id,
      jobId: data.jobId,
      resumeUrl: data.resumeUrl,
      coverLetterUrl: data.coverLetterUrl,
      portfolioUrl: data.portfolioUrl,
      linkedInUrl: data.linkedInUrl,
      websiteUrl: data.websiteUrl,
      customAnswers: data.customAnswers,
      questionnaireData: data.questionnaireData,
    });

    // Profile Enhancement: If a resume was uploaded, we should ideally have it parsed.
    // However, data.resumeUrl is just a string. 
    // In a full implementation, we'd need the buffer or we'd re-trigger parsing if not already done.
    // For now, if we have the file in req (not available here in service directly), we'd parse.
    // Assuming the frontend might call the parse endpoint separately, or we add file support here.

    return application;
  }

  async acceptJobInvitation(candidateId: string, token: string, applicationData: any): Promise<Application> {
    const invitation = await this.applicationRepository.findInvitationByToken(token);
    if (!invitation) throw new HttpException(404, 'Invitation not found');
    if (invitation.expires_at < new Date()) throw new HttpException(400, 'Invitation expired');
    if (invitation.status === 'ACCEPTED') throw new HttpException(400, 'Invitation already accepted');

    const application = await this.submitApplication({
      candidateId,
      jobId: invitation.job_id,
      ...applicationData,
    });

    await this.applicationRepository.updateInvitationStatus(
      invitation.id,
      'ACCEPTED' as any,
      new Date(),
      application.id
    );

    return application;
  }

  async createManualApplication(
    companyId: string,
    jobId: string,
    candidateId: string,
    recruiterId: string,
    data: any
  ): Promise<Application> {
    const jobRepository = new JobRepository();
    const job = await jobRepository.findById(jobId);
    if (!job || job.company_id !== companyId) {
      throw new HttpException(403, 'Job not found or access denied');
    }

    const hasApplied = await this.applicationRepository.checkExistingApplication(candidateId, jobId);
    if (hasApplied) throw new HttpException(400, 'Candidate already applied');

    // Create the application manually
    return this.applicationRepository.create({
      candidate: { connect: { id: candidateId } },
      job: { connect: { id: jobId } },
      status: 'NEW',
      stage: 'NEW_APPLICATION',
      resume_url: data.resumeUrl,
      cover_letter_url: data.coverLetterUrl,
      portfolio_url: data.portfolioUrl,
      linked_in_url: data.linkedInUrl,
      website_url: data.websiteUrl,
      manually_added: true,
      added_by: recruiterId,
      added_at: new Date(),
    } as any);
  }

  async addFromTalentPool(
    jobId: string,
    candidateId: string,
    recruiterId: string,
    companyId: string
  ): Promise<any> {
    const jobRepository = new JobRepository();
    const job = await jobRepository.findById(jobId);
    if (!job || job.company_id !== companyId) {
      throw new HttpException(403, 'Job not found or access denied');
    }

    const hasApplied = await this.applicationRepository.checkExistingApplication(candidateId, jobId);
    if (hasApplied) throw new HttpException(400, 'Candidate already applied');

    // For now, let's just create a manual application
    return this.createManualApplication(companyId, jobId, candidateId, recruiterId, {});
  }

  async moveToRound(id: string, roundId: string, invitedBy?: string): Promise<ApplicationRoundProgress> {
    const progress = await this.applicationRepository.moveToRound(id, roundId);

    // Check if round is an assessment round
    const round = await this.prisma.jobRound.findUnique({
      where: { id: roundId },
      select: { type: true }
    });

    if (round?.type === 'ASSESSMENT' && invitedBy) {
      await this.assessmentService.autoAssignAssessment(id, roundId, invitedBy);
    }

    return progress;
  }

  async updateManualScreening(id: string, data: any): Promise<Application> {
    return this.applicationRepository.updateManualScreening(id, data);
  }

  async getApplicationResume(id: string): Promise<any> {
    const application = await this.applicationRepository.findById(id);
    if (!application) throw new HttpException(404, 'Application not found');
    if (!application.resume_url) throw new HttpException(404, 'Resume not found');
    return { url: application.resume_url };
  }

  async getApplicationForAdmin(id: string): Promise<Application | null> {
    const application = await this.applicationRepository.findById(id);
    if (!application) throw new HttpException(404, 'Application not found');
    return this.mapToResponse(application);
  }

  private mapToResponse(app: any): any {
    if (!app) return null;

    return {
      ...app,
      // Map database fields to camelCase for frontend
      jobId: app.job_id,
      candidateId: app.candidate_id,
      appliedDate: app.applied_date,
      resumeUrl: app.resume_url,
      coverLetterUrl: app.cover_letter_url,
      portfolioUrl: app.portfolio_url,
      linkedInUrl: app.linked_in_url,
      websiteUrl: app.website_url,
      customAnswers: app.custom_answers,
      questionnaireData: app.questionnaire_data,
      isRead: app.is_read,
      isNew: app.is_new,
      recruiterNotes: app.recruiter_notes,
      shortlistedAt: app.shortlisted_at,
      shortlistedBy: app.shortlisted_by,
      manuallyAdded: app.manually_added,
      addedAt: app.added_at,
      addedBy: app.added_by,
      screeningStatus: app.screening_status,
      screeningNotes: app.screening_notes,
      reviewNotes: app.screening_notes, // alias used in some places
      videoInterviewStatus: app.video_interview_status,
      // Nested mapping if available
      job: app.job ? {
        ...app.job,
        id: app.job.id,
        title: app.job.title,
        location: app.job.location,
        employmentType: app.job.employment_type,
        workArrangement: app.job.work_arrangement,
        salaryMin: app.job.salary_min,
        salaryMax: app.job.salary_max,
        salaryCurrency: app.job.salary_currency,
        company: app.job.company
      } : undefined,
      candidate: app.candidate ? {
        ...app.candidate,
        firstName: app.candidate.first_name,
        lastName: app.candidate.last_name,
        linkedInUrl: app.candidate.linked_in_url,
        emailVerified: app.candidate.email_verified,
      } : undefined
    };
  }
}
