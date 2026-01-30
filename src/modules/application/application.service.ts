import { BaseService } from '../../core/service';
import { ApplicationRepository } from './application.repository';
import { Application, ApplicationStatus, ApplicationStage } from '@prisma/client';
import { CandidateScoringService } from '../ai/candidate-scoring.service';
import { HttpException } from '../../core/http-exception';
import { SubmitApplicationRequest, ApplicationFilters } from './application.model';
import { CandidateRepository } from '../candidate/candidate.repository';
import { DocumentParser } from '../../utils/document-parser';

export class ApplicationService extends BaseService {
  constructor(
    public applicationRepository: ApplicationRepository, // Changed to public to allow controller access for security check
    private candidateRepository: CandidateRepository
  ) {
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

    // Trigger AI Scoring asynchronously
    this.triggerAiAnalysis(application.id, data.jobId).catch(err => {
      console.error('Failed to trigger AI analysis:', err);
    });

    return application;
  }

  async getApplication(id: string): Promise<any> {
    const app = await this.applicationRepository.findById(id);
    if (!app) {
      throw new HttpException(404, 'Application not found');
    }
    return this.mapApplication(app);
  }

  async getCandidateApplications(candidateId: string): Promise<Application[]> {
    return this.applicationRepository.findByCandidateId(candidateId);
  }

  async getJobApplications(jobId: string, filters?: ApplicationFilters): Promise<{ applications: Application[]; roundProgress: Record<string, any> }> {
    const applications = await this.applicationRepository.findByJobId(jobId, filters);

    // Extract round progress and map applications
    const roundProgress: Record<string, any> = {};
    const mappedApplications = applications.map(app => {
      // Extract round progress
      const progress = (app as any).application_round_progress?.[0];
      if (progress) {
        roundProgress[app.id] = {
          roundId: progress.job_round_id,
          stage: app.stage
        };
      }
      return this.mapApplication(app);
    });

    return { applications: mappedApplications, roundProgress };
  }

  async triggerAiAnalysis(applicationId: string, jobId: string): Promise<void> {
    try {
      const result = await CandidateScoringService.scoreCandidate({ applicationId, jobId });

      await this.applicationRepository.saveScreeningResult({
        applicationId,
        screeningType: 'AUTOMATED',
        status: result.recommendation === 'strong_no_hire' ? 'FAILED' : 'PASSED',
        score: result.scores.overall,
        criteriaMatched: result, // Save full analysis JSON
        reviewedBy: 'AI_SYSTEM'
      });

      // Update application score
      await this.applicationRepository.updateScore(applicationId, result.scores.overall);

    } catch (error) {
      console.error('Error in triggerAiAnalysis:', error);
      // Log but don't fail the request
    }
  }

  private mapApplication(app: any): Application {
    // Find AI screening result (AUTOMATED) or fallback to first result
    const aiResult = Array.isArray(app.screening_result)
      ? app.screening_result.find((r: any) => r.screening_type === 'AUTOMATED')
      : app.screening_result;

    // Use criteria_matched from new result, or fallback to legacy app.ai_analysis
    const analysisData = aiResult?.criteria_matched || app.ai_analysis || {};

    const hasAnalysis = !!aiResult || !!app.ai_analysis;

    const aiAnalysis = hasAnalysis ? {
      summary: analysisData.summary || aiResult?.summary, // Support both new execution JSON and potential legacy fields
      detailedAnalysis: analysisData.detailedAnalysis || analysisData.detailed_analysis,
      behavioralTraits: analysisData.behavioralTraits || analysisData.behavioral_traits,
      concerns: analysisData.concerns,
      strengths: analysisData.strengths,
      careerTrajectory: analysisData.careerTrajectory || analysisData.career_trajectory,
      flightRisk: analysisData.flightRisk || analysisData.flight_risk,
      culturalFit: analysisData.culturalFit || analysisData.cultural_fit,
      salaryBenchmark: analysisData.salaryBenchmark || analysisData.salary_benchmark,
      technicalAssessment: analysisData.technicalAssessment || analysisData.technical_assessment,
    } : null;

    // Map candidate data to parsedResume format
    const parsedResume = app.candidate ? {
      skills: app.candidate.skills?.map((s: any) => ({
        name: s.name,
        proficiency: s.level || 'Intermediate' // Default to intermediate if missing
      })) || [],
      workHistory: app.candidate.work_experience?.map((w: any) => ({
        company: w.company,
        role: w.role,
        startDate: w.start_date,
        endDate: w.end_date,
        description: w.description
      })) || [],
      education: app.candidate.education?.map((e: any) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.start_date,
        endDate: e.end_date
      })) || []
    } : null;

    return {
      ...app,
      // Map screening_result to aiAnalysis property expected by frontend
      aiAnalysis,
      // Map candidate details to parsedResume property expected by frontend
      parsedResume,
    };
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

  async createManualApplication(data: any, recruiterId: string): Promise<Application> {
    // 1. Check or Create Candidate
    let candidate = await this.candidateRepository.findByEmail(data.email);

    if (!candidate) {
      candidate = await this.candidateRepository.create({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        password_hash: '', // No password for manually added
        status: 'ACTIVE',
        resumes: data.resumeUrl ? {
          create: {
            file_url: data.resumeUrl,
            file_name: 'Resume.pdf', // Default
            file_size: 0,
            file_type: 'application/pdf',
            content: '', // content not available yet
            is_default: true
          }
        } : undefined
      });
    } else {
      // If candidate exists, add resume if provided
      if (data.resumeUrl) {
        // We need to add resume. Repository doesn't expose addResume directly but UPDATE works with nested create
        await this.candidateRepository.update(candidate.id, {
          resumes: {
            create: {
              file_url: data.resumeUrl,
              file_name: 'Resume.pdf',
              file_size: 0,
              file_type: 'application/pdf',
              is_default: false
            }
          }
        });
      }
    }

    // 2. Create Application
    const existingApp = await this.applicationRepository.checkExistingApplication(candidate.id, data.jobId);
    if (existingApp) {
      throw new HttpException(400, 'Candidate already applied to this job');
    }

    const app = await this.applicationRepository.create({
      candidate: { connect: { id: candidate.id } },
      job: { connect: { id: data.jobId } },
      status: 'NEW',
      stage: 'NEW_APPLICATION',
      manually_added: true,
      added_by: recruiterId,
      added_at: new Date(),
      resume_url: data.resumeUrl,
      source: 'MANUAL',
      recruiter_notes: data.notes,
      tags: data.tags || []
    });

    return app;
  }

  async updateManualScreening(id: string, data: { status: any, score?: number, notes?: string, date?: Date }): Promise<Application> {
    return this.applicationRepository.update(id, {
      manual_screening_status: data.status,
      manual_screening_score: data.score,
      screening_notes: data.notes,
      manual_screening_date: data.date || new Date(),
      manual_screening_completed: true
    });
  }

  async createFromTalentPool(candidateId: string, jobId: string, recruiterId: string): Promise<Application> {
    const hasApplied = await this.applicationRepository.checkExistingApplication(candidateId, jobId);
    if (hasApplied) {
      throw new HttpException(400, 'Candidate already applied');
    }

    const candidate = await this.candidateRepository.findById(candidateId);
    if (!candidate) throw new HttpException(404, 'Candidate not found');

    return this.applicationRepository.create({
      candidate: { connect: { id: candidateId } },
      job: { connect: { id: jobId } },
      status: 'NEW',
      stage: 'NEW_APPLICATION',
      manually_added: true,
      added_by: recruiterId,
      source: 'TALENT_POOL',
      resume_url: candidate.resume_url // Copy resume from candidate profile if exists
    });
  }

  async getResume(id: string): Promise<any> {
    const app = await this.applicationRepository.findById(id);
    if (!app) {
      throw new HttpException(404, 'Application not found');
    }
    if (!app.resume_url) {
      throw new HttpException(404, 'Resume not found');
    }

    console.log('[getResume] Application ID:', id);
    console.log('[getResume] Application resume_url:', app.resume_url);

    // Try to find the detailed resume record to get content
    let resumeRecord = await this.applicationRepository.findResumeByUrl(app.resume_url);
    console.log('[getResume] Found resumeRecord by URL match:', !!resumeRecord);

    let parsedContent = resumeRecord?.content || null;
    console.log('[getResume] Existing content in resumeRecord:', parsedContent ? `${parsedContent.substring(0, 50)}...` : 'null');

    if (resumeRecord && !parsedContent) {
      // Content missing in DB, trigger parsing (Self-Healing)
      try {
        console.log(`[getResume] Parsing missing content for resume: ${resumeRecord.id}`);
        const { DocumentParser } = await import('../../utils/document-parser');
        parsedContent = await DocumentParser.parseFromUrl(resumeRecord.file_url);
        console.log('[getResume] Parsed content length:', parsedContent?.length || 0);
        if (parsedContent) {
          await this.applicationRepository.updateResumeContent(resumeRecord.id, parsedContent);
          console.log('[getResume] Updated resume content in DB');
        }
      } catch (e) {
        console.error('[getResume] Failed to parse resume on fly', e);
      }
    } else if (!resumeRecord) {
      // No record found, try parsing from URL directly to return content
      console.log('[getResume] No resumeRecord found, parsing directly from app.resume_url');
      try {
        const { DocumentParser } = await import('../../utils/document-parser');
        parsedContent = await DocumentParser.parseFromUrl(app.resume_url);
        console.log('[getResume] Parsed content length from app URL:', parsedContent?.length || 0);
      } catch (e) {
        console.error('[getResume] Failed to parse resume on fly from app url', e);
      }
    }

    if (resumeRecord) {
      return {
        id: resumeRecord.id,
        candidateId: resumeRecord.candidate_id,
        fileName: resumeRecord.file_name,
        fileUrl: resumeRecord.file_url,
        fileSize: resumeRecord.file_size,
        fileType: resumeRecord.file_type,
        uploadedAt: resumeRecord.uploaded_at,
        content: parsedContent, // Use the potentially newly parsed content
        isDefault: resumeRecord.is_default
      };
    }

    // Fallback if no detailed record
    return {
      id: app.id,
      candidateId: app.candidate_id,
      fileName: 'Resume.pdf',
      fileUrl: app.resume_url,
      fileSize: 0,
      fileType: 'application/pdf',
      uploadedAt: app.created_at,
      uploadedBy: app.candidate_id,
      content: parsedContent
    };
  }

  async moveToRound(applicationId: string, jobRoundId: string, userId: string): Promise<Application> {
    // Verify application exists
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    // Handle fallback round IDs (e.g., "fixed-OFFER-{jobId}")
    let actualRoundId = jobRoundId;

    // We need to access JobRoundService/Repository to resolve rounds.
    // For now assuming we cannot inject it due to circular deps, we access prisma via repository if needed,
    // OR we instantiate a repository here. Best practice is to have it injected.
    // I'll assume we can't easily inject it right now without refactoring constructor, 
    // so I'll rely on a helper in ApplicationRepository OR add the dependency if safe.
    // Let's rely on ApplicationRepository helper methods to interact with JobRounds which is not ideal but safe.
    // Ideally: new JobRoundRepository() or injected.

    // NOTE: For this "Restoration" I will use a helper in ApplicationRepository to find round by ID or Fixed Key
    const round = await this.applicationRepository.findJobRound(actualRoundId);
    let targetRound = round;

    if (!targetRound && actualRoundId.startsWith('fixed-')) {
      const parts = actualRoundId.split('-');
      if (parts.length >= 2) {
        const fixedKey = parts[1]; // e.g., "OFFER"
        // Try find by fixed key
        targetRound = await this.applicationRepository.findJobRoundByFixedKey(application.job_id, fixedKey);

        // If still not found, we might need to initialize (this checks logic from old backend)
        // For now, assuming fixed rounds are likely present.
        if (targetRound) {
          actualRoundId = targetRound.id;
        }
      }
    }

    if (!targetRound) {
      throw new HttpException(404, 'Round not found');
    }

    if (targetRound.job_id !== application.job_id) {
      throw new HttpException(403, 'Round does not belong to the same job');
    }

    // Upsert Progress
    await this.applicationRepository.upsertRoundProgress(applicationId, actualRoundId);

    // Map Round to Stage
    let mappedStage: ApplicationStage = 'NEW_APPLICATION';
    if (targetRound.is_fixed && targetRound.fixed_key) {
      const key = targetRound.fixed_key;
      if (key === 'NEW') mappedStage = 'NEW_APPLICATION';
      else if (key === 'OFFER') mappedStage = 'OFFER_EXTENDED';
      else if (key === 'HIRED') mappedStage = 'OFFER_ACCEPTED';
      else if (key === 'REJECTED') mappedStage = 'REJECTED';
    } else {
      if (targetRound.type === 'ASSESSMENT') mappedStage = 'RESUME_REVIEW';
      else if (targetRound.type === 'INTERVIEW') mappedStage = 'TECHNICAL_INTERVIEW';
    }

    // Update Application Stage
    const updatedApp = await this.applicationRepository.updateStage(applicationId, mappedStage);

    // Auto-assign Assessment
    if (targetRound.type === 'ASSESSMENT') {
      // Need to dynamic import or use a service locator to avoid circular dependency if possible
      const { AssessmentService } = await import('../assessment/assessment.service');
      const { AssessmentRepository } = await import('../assessment/assessment.repository'); // Import repo to instantiate service
      // Instantiate manually if not in container (NestJS style vs manual) - The codebase seems manual dependency injection or simple classes.
      // Looking at structure, simple classes.
      const assessmentService = new AssessmentService(new AssessmentRepository());
      try {
        await assessmentService.autoAssignAssessment(applicationId, actualRoundId, userId);
      } catch (e) {
        console.error('Failed to auto-assign assessment', e);
      }
    }
    // Auto-schedule Interview
    else if (targetRound.type === 'INTERVIEW') {
      const { InterviewService } = await import('../interview/interview.service');
      try {
        await InterviewService.autoScheduleInterview({
          applicationId,
          jobRoundId: actualRoundId,
          scheduledBy: userId
        });
      } catch (e) {
        console.error('Failed to auto-schedule interview', e);
      }
    }

    // Trigger Emails (Omitted/Placeholder as EmailAutomationService might not exist or be different)

    return updatedApp;
  }
}
