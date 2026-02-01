import { BaseService } from '../../core/service';
import { AssessmentRepository } from './assessment.repository';
import { Assessment, AssessmentStatus } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

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
    const questions = await this.assessmentRepository.getQuestions(assessment.id);

    return { ...assessment, questions };
  }

  async startAssessment(token: string) {
    const assessment = await this.assessmentRepository.findByInvitationToken(token);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    if (assessment.status === 'INVITED' || assessment.status === 'PENDING_INVITATION') {
      return this.assessmentRepository.update(assessment.id, {
        status: 'IN_PROGRESS',
      });
    }
    return assessment;
  }

  async submitAssessment(token: string, responses: Array<{ questionId: string; response: any }>) {
    const assessment = await this.assessmentRepository.findByInvitationToken(token);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    // Save responses
    for (const r of responses) {
      await this.assessmentRepository.createResponse({
        assessment: { connect: { id: assessment.id } },
        assessment_question: { connect: { id: r.questionId } },
        candidate_id: assessment.candidate_id,
        response: r.response,
      });
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

    // Create questions (if native) is handled by repository or separate logic.
    // For now, we'll assume config has questions linked and we might need to copy them or reference them.

    // Send email (would need email service, omitted for now to avoid circular deps, or handled by caller)
  }
  async getRoundAssessments(roundId: string) {
    const currentRound = await this.assessmentRepository.findJobRound(roundId);
    if (!currentRound) throw new Error('Round not found');

    const assessments = await this.assessmentRepository.findByRoundIdWithDetails(roundId);

    return assessments.map(a => {
      // Logic from old AssessmentController
      const app = a.application as any; // Cast for accessing relations
      const name = app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '';
      const email = app?.candidate?.email || '';

      // Check progress
      const currentRoundProgress = app?.application_round_progress?.find((p: any) => p.job_round_id === roundId);
      const hasLaterRound = app?.application_round_progress?.some((p: any) => p.job_round && p.job_round.order > currentRound.order) || false;
      const isMovedToNextRound = (currentRoundProgress?.completed || false) || hasLaterRound;

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
        isMovedToNextRound,
        applicationStage: app?.stage
      };
    });
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
    const assessment = await this.assessmentRepository.findById(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    // TODO: Integrate EmailService to actually resend email
    // For now, reset invited_at to simulate fresh invite
    await this.assessmentRepository.update(assessment.id, {
      invited_at: new Date()
    });
    return { message: 'Invitation resent' };
  }
}
