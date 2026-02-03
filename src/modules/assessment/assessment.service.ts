import { BaseService } from '../../core/service';
import { AssessmentRepository } from './assessment.repository';
import { Assessment, AssessmentStatus } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { emailService } from '../email/email.service';
import { env } from '../../config/env';

export class AssessmentService extends BaseService {
  constructor(private assessmentRepository: AssessmentRepository) {
    super();
  }

  async getAssessment(id: string) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    return assessment;
  }

  async getAssessmentByToken(token: string) {
    const assessment = await this.assessmentRepository.findByInvitationToken(token);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    // Check if expired
    if (assessment.expiry_date && new Date() > assessment.expiry_date) {
      throw new HttpException(410, 'Assessment expired');
    }

    // Fetch questions
    let questions = await this.assessmentRepository.getQuestions(assessment.id);

    // Self-healing: If no questions found OR questions are malformed (empty text), try to sync from config
    // This handles cases where config was added after invitation, copy failed, or previous self-heal failed due to property mismatch
    const hasMalformedQuestions = questions.length > 0 && questions.some(q => !q.question_text || q.question_text.trim() === '' || q.question_text === 'Question text missing');

    if ((questions.length === 0 || hasMalformedQuestions) && (assessment.status === 'INVITED' || assessment.status === 'PENDING_INVITATION' || assessment.status === 'IN_PROGRESS')) {
      if (assessment.job_round_id) {
        const config = await this.assessmentRepository.findConfigByJobRoundId(assessment.job_round_id);
        if (config && config.questions && Array.isArray(config.questions) && (config.questions as any[]).length > 0) {

          // If we have malformed questions, delete them first to avoid duplicates
          if (hasMalformedQuestions) {
            await this.assessmentRepository.deleteQuestions(assessment.id);
          }

          const questionData = (config.questions as any[]).map((q, index) => ({
            assessment_id: assessment.id,
            question_text: q.text || q.question_text || q.question || q.title || 'Question text missing',
            question_type: q.type || q.question_type || 'single-choice',
            options: q.options || null,
            points: q.points || 1,
            order: q.order !== undefined ? q.order : index
          }));
          await this.assessmentRepository.createManyQuestions(questionData);
          questions = await this.assessmentRepository.getQuestions(assessment.id);
        }
      }
    }

    return { ...assessment, questions };
  }

  async startAssessment(token: string) {
    const assessment = await this.assessmentRepository.findByInvitationToken(token);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    if (assessment.status === 'INVITED' || assessment.status === 'PENDING_INVITATION') {
      return this.assessmentRepository.update(assessment.id, {
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    }
    return assessment;
  }

  async saveResponse(token: string, questionId: string, response: any) {
    const assessment = await this.assessmentRepository.findByInvitationToken(token);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    if (assessment.status === 'COMPLETED' || assessment.status === 'EXPIRED') {
      throw new HttpException(400, 'Assessment is already submitted or expired');
    }

    return this.assessmentRepository.upsertResponse(
      assessment.id,
      questionId,
      assessment.candidate_id,
      response
    );
  }

  async submitAssessment(token: string, responses: Array<{ questionId: string; response: any }>) {
    const assessment = await this.assessmentRepository.findByInvitationToken(token);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    // Save final responses (if any provided in body, though we prefer auto-save)
    if (responses && responses.length > 0) {
      for (const r of responses) {
        await this.assessmentRepository.upsertResponse(
          assessment.id,
          r.questionId,
          assessment.candidate_id,
          r.response
        );
      }
    }

    // Update status
    return this.assessmentRepository.update(assessment.id, {
      status: 'COMPLETED',
      completed_at: new Date(),
    });
  }

  async autoAssignAssessment(
    applicationId: string,
    jobRoundId: string,
    invitedBy: string
  ): Promise<void> {
    // Check if assessment already exists
    const existingAssessment = await this.assessmentRepository.findByApplicationAndRound(applicationId, jobRoundId);
    if (existingAssessment) return;

    // Get configuration
    // Note: We need to access prisma directly for configuration as repository might not have it exposed
    // Assuming BaseService gives access to prisma client or we need to add it to repository
    // For now, I'll assume AssessmentRepository has a method or I can use a raw prisma call if I had access.
    // Since I don't have easy access to Prisma client here (it's in repository), I will add a method to repository to get config.
    const config = await this.assessmentRepository.findConfigByJobRoundId(jobRoundId);

    if (!config || !config.enabled) return;

    // Get application details (needed for candidate/job IDs)
    // We can fetch this via a new repository method or assume we have the IDs.
    // Ideally we should pass candidateId and jobId to this method to avoid circular dependency with ApplicationService
    // But for now let's query the application using a raw prisma call via repository if possible, or just add a helper in repository.
    const application = await this.assessmentRepository.findApplicationForAssignment(applicationId);
    if (!application) throw new Error('Application not found');

    // Calculate expiry
    let expiryDate: Date | undefined;
    if (config.deadline_days) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + config.deadline_days);
    }

    // Create assessment
    // Create assessment
    const assessment = await this.assessmentRepository.create({
      user: { connect: { id: invitedBy } },
      application: { connect: { id: applicationId } },
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      // used to be job_round_id: scalar but let's try connect if easier, or keep scalar if allowed
      job_round_id: jobRoundId,
      assessment_type: 'SKILLS_BASED', // Assuming string literal works for Enum
      provider: config.provider || 'native',
      invited_at: new Date(),
      expiry_date: expiryDate,
      pass_threshold: config.pass_threshold || undefined,
      status: 'INVITED',
      invitation_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    });

    // Link to progress
    await this.assessmentRepository.linkToRoundProgress(applicationId, jobRoundId, assessment.id);

    // Create questions from config
    if (config.questions && Array.isArray(config.questions)) {
      const questionData = (config.questions as any[]).map((q, index) => ({
        assessment_id: assessment.id,
        question_text: q.text || q.question_text || '',
        question_type: q.type || q.question_type || 'single-choice',
        options: q.options || null,
        points: q.points || 1,
        order: q.order !== undefined ? q.order : index
      }));
      await this.assessmentRepository.createManyQuestions(questionData);
    }

    // Send email
    try {
      const candidateName = `${application.candidate.first_name} ${application.candidate.last_name}`;
      const jobTitle = application.job.title;
      const assessmentUrl = `${env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;

      await emailService.sendAssessmentInvitation({
        to: application.candidate.email,
        candidateName,
        jobTitle,
        assessmentUrl,
        expiryDate
      });
    } catch (error) {
      console.error(`[AssessmentService] Failed to send email to ${application.candidate.email}`, error);
      // We don't fail the assignment if email fails, but we should log it
    }
  }

  // Manual invite - works without requiring assessment config to be enabled
  async manualInviteToAssessment(
    applicationId: string,
    jobRoundId: string,
    invitedBy: string
  ): Promise<{ success: boolean, assessmentId?: string, error?: string }> {
    // Check if assessment already exists
    const existingAssessment = await this.assessmentRepository.findByApplicationAndRound(applicationId, jobRoundId);
    if (existingAssessment) {
      return { success: false, error: 'Assessment already exists for this candidate in this round' };
    }

    // Get application details
    const application = await this.assessmentRepository.findApplicationForAssignment(applicationId);
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Get config if available (for settings like pass_threshold, deadline)
    const config = await this.assessmentRepository.findConfigByJobRoundId(jobRoundId);

    // Calculate expiry (7 days default if no config)
    let expiryDate: Date = new Date();
    expiryDate.setDate(expiryDate.getDate() + (config?.deadline_days || 7));

    // Create assessment
    const assessment = await this.assessmentRepository.create({
      user: { connect: { id: invitedBy } },
      application: { connect: { id: applicationId } },
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      job_round_id: jobRoundId,
      assessment_type: 'SKILLS_BASED',
      provider: config?.provider || 'native',
      invited_at: new Date(),
      expiry_date: expiryDate,
      pass_threshold: config?.pass_threshold || 70,
      status: 'INVITED',
      invitation_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    });

    // Link to progress
    await this.assessmentRepository.linkToRoundProgress(applicationId, jobRoundId, assessment.id);

    // Create questions from config
    if (config?.questions && Array.isArray(config.questions)) {
      const questionData = (config.questions as any[]).map((q, index) => ({
        assessment_id: assessment.id,
        question_text: q.text || q.question_text || '',
        question_type: q.type || q.question_type || 'single-choice',
        options: q.options || null,
        points: q.points || 1,
        order: q.order !== undefined ? q.order : index
      }));
      await this.assessmentRepository.createManyQuestions(questionData);
    }

    // Send email
    try {
      const candidateName = `${application.candidate.first_name} ${application.candidate.last_name}`;
      const jobTitle = application.job.title;
      const assessmentUrl = `${env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;

      await emailService.sendAssessmentInvitation({
        to: application.candidate.email,
        candidateName,
        jobTitle,
        assessmentUrl,
        expiryDate
      });
    } catch (error) {
      console.error(`[AssessmentService] Failed to send email to ${application.candidate.email}`, error);
    }

    return { success: true, assessmentId: assessment.id };
  }
  async getRoundAssessments(roundId: string) {
    const currentRound = await this.assessmentRepository.findJobRound(roundId);
    if (!currentRound) throw new Error('Round not found');

    const assessments = await this.assessmentRepository.findByRoundIdWithDetails(roundId);

    // Map assessments and filter out moved candidates
    const mappedAssessments = assessments.map(a => {
      const app = a.application as any;
      const name = app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '';
      const email = app?.candidate?.email || '';

      // Check if candidate has moved to a later round
      const hasLaterRound = app?.application_round_progress?.some(
        (p: any) => p.job_round && p.job_round.order > currentRound.order
      ) || false;

      // Calculate Average Score
      let averageScore: number | null = null;
      if (a.assessment_response && a.assessment_response.length > 0) {
        const grades = a.assessment_response
          .flatMap((r: any) => r.assessment_grade || [])
          .filter((g: any) => g.score !== null && g.score !== undefined);

        if (grades.length > 0) {
          const sum = grades.reduce((acc: number, curr: any) => acc + curr.score, 0);
          averageScore = Number((sum / grades.length).toFixed(2));
        }
      }

      // Determine if assessment is finalized (has score and all grading complete)
      const isFinalized = a.status === 'COMPLETED' && averageScore !== null;

      return {
        id: a.id,
        applicationId: a.application_id,
        candidateName: name,
        candidateEmail: email,
        status: a.status,
        score: (a as any).results?.score || null,
        averageScore,
        invitedAt: a.invited_at,
        completedAt: a.completed_at,
        invitationToken: a.invitation_token,
        isMovedToNextRound: hasLaterRound,
        isFinalized,
        applicationStage: app?.stage
      };
    });

    // Return all assessments - frontend decides what to show based on current application stage
    return mappedAssessments;
  }

  async getGradingDetails(assessmentId: string) {
    const assessment = await this.assessmentRepository.getGradingData(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    return assessment;
  }

  async saveGrade(assessmentId: string, grades: Array<{ questionId: string; score: number; feedback: string }>, graderId: string) {
    const assessment = await this.assessmentRepository.getGradingData(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    for (const g of grades) {
      // Find response for this question
      const response = assessment.assessment_response.find(r => r.question_id === g.questionId);
      if (response) {
        await this.assessmentRepository.upsertGrade(response.id, graderId, g.score, g.feedback);
      }
    }
    return { message: 'Grades saved' };
  }

  async addComment(assessmentId: string, comment: string, userId: string) {
    const assessment = await this.assessmentRepository.findById(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    return this.assessmentRepository.addComment(assessmentId, userId, comment);
  }

  async finalizeAssessment(assessmentId: string) {
    const assessment = await this.assessmentRepository.getGradingData(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    // Calculate Average Score
    let averageScore: number = 0;
    if (assessment.assessment_response && assessment.assessment_response.length > 0) {
      const grades = assessment.assessment_response
        .flatMap((r: any) => r.assessment_grade || [])
        .filter((g: any) => g.score !== null && g.score !== undefined);

      if (grades.length > 0) {
        const sum = grades.reduce((acc: number, curr: any) => acc + curr.score, 0);
        averageScore = Number((sum / grades.length).toFixed(2));
      }
    }

    // Update Assessment Status and Score
    // Note: 'results' is a Json field, we store score there for persistent record
    await this.assessmentRepository.update(assessment.id, {
      status: 'COMPLETED',
      completed_at: assessment.completed_at || new Date(),
      results: { score: averageScore }
    });

    // Automation Logic
    if (assessment.job_round_id) {
      const config = await this.assessmentRepository.findConfigByJobRoundId(assessment.job_round_id);

      if (config) {
        const passThreshold = config.pass_threshold || 70;

        if ((config as any).auto_reject_on_fail && averageScore < passThreshold) {
          await this.assessmentRepository.rejectApplication(assessment.application_id);
        } else if ((config as any).auto_move_on_pass && averageScore >= passThreshold) {
          await this.assessmentRepository.moveToNextRound(assessment.application_id, assessment.job_round_id);
        }
      }
    }

    return { success: true, averageScore };
  }

  async resendInvitation(assessmentId: string) {
    const assessment = await this.assessmentRepository.findWithCandidateDetails(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    // Reset invited_at
    await this.assessmentRepository.update(assessment.id, {
      invited_at: new Date()
    });

    if (assessment.application) {
      try {
        const candidateName = `${assessment.application.candidate.first_name} ${assessment.application.candidate.last_name}`;
        const jobTitle = assessment.application.job.title;
        const assessmentUrl = `${env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;

        await emailService.sendAssessmentInvitation({
          to: assessment.application.candidate.email,
          candidateName,
          jobTitle,
          assessmentUrl,
          expiryDate: assessment.expiry_date || undefined
        });
      } catch (error) {
        console.error(`[AssessmentService] Failed to resend email to ${assessment.application.candidate.email}`, error);
      }
    }

    return { message: 'Invitation resent' };
  }
}
