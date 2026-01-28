import { BaseService } from '../../core/service';
import { ApplicationRepository } from './application.repository';
import { Prisma, Application, ApplicationStatus, ApplicationStage, ApplicationRoundProgress } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { SubmitApplicationRequest, ApplicationFilters, AnonymousApplicationRequest } from './application.model';
import { CandidateRepository } from '../candidate/candidate.repository';
import { CandidateService } from '../candidate/candidate.service';
import { JobRepository } from '../job/job.repository';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentRepository } from '../assessment/assessment.repository';

export class ApplicationService extends BaseService {
  private assessmentService: AssessmentService;

  constructor(private applicationRepository: ApplicationRepository) {
    super();
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

    return application;
  }

  async getApplication(id: string): Promise<Application | null> {
    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return application;
  }

  async getCandidateApplications(candidateId: string): Promise<Application[]> {
    return this.applicationRepository.findByCandidateId(candidateId);
  }

  async getJobApplications(jobId: string, filters?: ApplicationFilters): Promise<Application[]> {
    return this.applicationRepository.findByJobId(jobId, filters);
  }

  async updateScore(id: string, score: number): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.applicationRepository.updateScore(id, score);
  }

  async updateRank(id: string, rank: number): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.applicationRepository.updateRank(id, rank);
  }

  async updateTags(id: string, tags: string[]): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.applicationRepository.updateTags(id, tags);
  }

  async shortlistCandidate(id: string, userId: string): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.applicationRepository.shortlist(id, userId);
  }

  async unshortlistCandidate(id: string): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.applicationRepository.unshortlist(id);
  }

  async updateStage(id: string, stage: ApplicationStage): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.applicationRepository.updateStage(id, stage);
  }

  async updateNotes(id: string, notes: string): Promise<Application> {
    const application = await this.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return this.applicationRepository.updateNotes(id, notes);
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

    return this.applicationRepository.update(id, {
      status: 'WITHDRAWN',
    });
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
    return this.applicationRepository.markAsRead(id);
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

    return this.submitApplication({
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
    return application;
  }
}
