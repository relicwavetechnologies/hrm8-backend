import { BaseService } from '../../core/service';
import { ApplicationRepository } from './application.repository';
import { Application, ApplicationStatus, ApplicationStage } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { SubmitApplicationRequest, ApplicationFilters } from './application.model';

export class ApplicationService extends BaseService {
  constructor(private applicationRepository: ApplicationRepository) {
    super();
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
}
