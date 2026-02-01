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
    const config = await this.assessmentRepository.findConfigByJobRoundId(jobRoundId);

    if (!config || !config.enabled) return;

    // Get application details
    const application = await this.assessmentRepository.findApplicationForAssignment(applicationId);
    if (!application) throw new Error('Application not found');

    // Calculate expiry
    let expiryDate: Date | undefined;
    if (config.deadline_days) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + config.deadline_days);
    }

    // Create assessment
    const assessment = await this.assessmentRepository.create({
      user: { connect: { id: invitedBy } },
      application: { connect: { id: applicationId } },
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      job_round_id: jobRoundId,
      assessment_type: 'SKILLS_BASED',
      provider: config.provider || 'native',
      invited_at: new Date(),
      expiry_date: expiryDate,
      pass_threshold: config.pass_threshold || undefined,
      status: 'INVITED',
      invitation_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    });

    // Link to progress
    await this.assessmentRepository.linkToRoundProgress(applicationId, jobRoundId, assessment.id);

    // Create questions (if native)
    if (config.questions && Array.isArray(config.questions)) {
      await this.createQuestions(assessment.id, config.questions);
    }
  }

  async createQuestions(assessmentId: string, questions: any[]): Promise<void> {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      await this.assessmentRepository.createQuestion({
        assessment: { connect: { id: assessmentId } },
        question_text: question.questionText || question.text || '',
        question_type: (question.type || question.questionType || 'MULTIPLE_CHOICE') as any,
        options: question.options || null,
        correct_answer: question.correctAnswer || question.correct_answer || null,
        points: question.points || 1,
        order: question.order ?? i,
      });
    }
  }

  async getRoundAssessments(roundId: string) {
    const currentRound = await this.assessmentRepository.findJobRound(roundId);
    if (!currentRound) throw new Error('Round not found');

    const assessments = await this.assessmentRepository.findByRoundIdWithDetails(roundId);

    return assessments.map(a => {
      const app = a.application as any;
      const name = app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '';
      const email = app?.candidate?.email || '';

      const currentRoundProgress = app?.application_round_progress?.find((p: any) => p.job_round_id === roundId);
      const hasLaterRound = app?.application_round_progress?.some((p: any) => p.job_round && p.job_round.order > currentRound.order) || false;
      const isMovedToNextRound = (currentRoundProgress?.completed || false) || hasLaterRound;

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
}
