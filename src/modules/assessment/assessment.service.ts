import { BaseService } from '../../core/service';
import { AssessmentRepository } from './assessment.repository';
import { Assessment, AssessmentStatus, AssessmentType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { emailService } from '../email/email.service';
import crypto from 'crypto';

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

    // Check if already completed
    if (assessment.status === 'COMPLETED') {
      throw new HttpException(400, 'Assessment already completed');
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

    if (assessment.status === 'COMPLETED') {
      throw new HttpException(400, 'Assessment already completed');
    }

    // Save responses
    for (const r of responses) {
      await this.assessmentRepository.createResponse({
        assessment: { connect: { id: assessment.id } },
        assessment_question: { connect: { id: r.questionId } },
        candidate_id: assessment.candidate_id,
        response: r.response,
      });
    }

    // Update status to COMPLETED
    const updated = await this.assessmentRepository.update(assessment.id, {
      status: 'COMPLETED',
      completed_at: new Date(),
    });

    // Handle Auto-scoring
    await this.scoreAssessment(assessment.id);

    // Send completion email
    const details = (await this.assessmentRepository.getAssessmentWithDetails(assessment.id)) as any;
    if (details?.application?.candidate && details?.application?.job) {
      await emailService.sendAssessmentCompletionEmail({
        to: details.application.candidate.email,
        candidateName: `${details.application.candidate.first_name} ${details.application.candidate.last_name}`,
        jobTitle: details.application.job.title,
        companyName: (details.application.job as any).company?.name || 'Our Company',
        completedAt: new Date(),
      });
    }

    return updated;
  }

  async getAssessmentConfig(jobRoundId: string) {
    return this.assessmentRepository.findConfiguration(jobRoundId);
  }

  async configureAssessment(jobRoundId: string, data: any) {
    return this.assessmentRepository.upsertConfiguration(jobRoundId, data);
  }

  async getRoundAssessments(jobRoundId: string) {
    return this.assessmentRepository.findByRound(jobRoundId);
  }

  async getAssessmentResults(id: string) {
    const assessment = await this.assessmentRepository.getAssessmentWithDetails(id);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    return assessment;
  }

  async getAssessmentForGrading(id: string) {
    const assessment = await this.assessmentRepository.getAssessmentWithDetails(id);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    return assessment;
  }

  async gradeResponse(responseId: string, data: { score: number; feedback?: string; graderId: string }) {
    return this.assessmentRepository.updateResponse(responseId, {
      score: data.score,
      feedback: data.feedback,
      graded_by: data.graderId,
      graded_at: new Date(),
    } as any);
  }

  async addAssessmentComment(id: string, data: { comment: string; authorId: string; authorName: string }) {
    const assessment = await this.getAssessment(id);

    // Create new comment using repository method
    return this.assessmentRepository.createComment({
      assessment: { connect: { id } },
      user: { connect: { id: data.authorId } },
      comment: data.comment
    });
  }

  async scoreAssessment(id: string, manualData?: { totalScore: number; passed: boolean; feedback?: string }) {
    const assessment = await this.assessmentRepository.getAssessmentWithDetails(id);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    if (manualData) {
      const result = await this.assessmentRepository.update(id, {
        results: {
          totalScore: manualData.totalScore,
          passed: manualData.passed,
          feedback: manualData.feedback,
          scoredAt: new Date().toISOString(),
          isManual: true,
        } as any,
        status: 'COMPLETED',
      });
      return result;
    }

    const questions = (assessment as any).assessment_question || [];
    const responses = (assessment as any).assessment_response || [];

    let totalScore = 0;
    let maxScore = 0;

    for (const question of questions) {
      maxScore += question.points || 0;
      const response = responses.find((r: any) => r.question_id === question.id);

      if (response && question.correct_answer) {
        const isCorrect = this.checkAnswer(question.question_type, response.response, question.correct_answer);
        if (isCorrect) {
          totalScore += question.points || 0;
          await this.assessmentRepository.updateResponse(response.id, { score: question.points });
        } else {
          await this.assessmentRepository.updateResponse(response.id, { score: 0 });
        }
      }
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = assessment.pass_threshold ? percentage >= assessment.pass_threshold : true;

    const result = await this.assessmentRepository.update(id, {
      results: {
        totalScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        passed,
        scoredAt: new Date().toISOString(),
      } as any,
      status: 'COMPLETED',
    });

    // Notify recruiter if passed/failed status is determined
    const details = assessment as any;
    if (details.application?.candidate && details.application?.job) {
      const recruiter = await this.prisma.user.findUnique({ where: { id: assessment.invited_by } });
      if (recruiter) {
        await emailService.sendAssessmentResultsNotification({
          to: recruiter.email,
          recruiterName: recruiter.name,
          candidateName: `${details.application.candidate.first_name} ${details.application.candidate.last_name}`,
          jobTitle: details.application.job.title,
          companyName: (details.application.job as any).company?.name || 'Our Company',
          assessmentScore: Math.round(percentage * 100) / 100,
          passThreshold: assessment.pass_threshold || undefined,
          passed,
          assessmentUrl: `${process.env.FRONTEND_URL}/jobs/${assessment.job_id}/applications/${assessment.application_id}?tab=assessments`,
          candidateProfileUrl: `${process.env.FRONTEND_URL}/jobs/${assessment.job_id}/applications/${assessment.application_id}`,
        });
      }
    }

    return result;
  }

  private checkAnswer(type: string, response: any, correct: any): boolean {
    if (!response || !correct) return false;

    switch (type) {
      case 'MULTIPLE_CHOICE':
        return String(response).trim().toLowerCase() === String(correct).trim().toLowerCase();
      case 'MULTIPLE_SELECT':
        if (!Array.isArray(response) || !Array.isArray(correct)) return false;
        return response.length === correct.length && response.every(r => correct.includes(r));
      case 'SHORT_ANSWER':
        return String(response).trim().toLowerCase() === String(correct).trim().toLowerCase();
      default:
        return false;
    }
  }

  async autoAssignAssessment(applicationId: string, jobRoundId: string, invitedBy: string) {
    const config = await this.assessmentRepository.findConfiguration(jobRoundId);
    if (!config || !(config as any).enabled || !(config as any).autoAssign) return;

    // Check if already assigned
    const existing = await this.assessmentRepository.findByApplicationAndRound(applicationId, jobRoundId);
    if (existing) return;

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { candidate: true, job: true }
    });

    if (!application) return;

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const assessment = await this.assessmentRepository.create({
      application: { connect: { id: applicationId } },
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      job_round_id: jobRoundId,
      assessment_type: (config as any).assessmentType || 'SKILLS_BASED',
      status: 'INVITED',
      invited_by: invitedBy,
      invitation_token: invitationToken,
      pass_threshold: (config as any).passThreshold,
    } as any);

    // Create questions from config
    if ((config as any).questions && Array.isArray((config as any).questions)) {
      for (let i = 0; i < (config as any).questions.length; i++) {
        const q = (config as any).questions[i];
        await this.assessmentRepository.createQuestion({
          assessment: { connect: { id: assessment.id } },
          question_text: q.text || q.questionText,
          question_type: q.type || 'MULTIPLE_CHOICE',
          options: q.options || null,
          correct_answer: q.correctAnswer || null,
          points: q.points || 1,
          order: q.order ?? i,
        });
      }
    }

    // Send invitation email
    await this.sendAssessmentInvitation(assessment.id);

    return assessment;
  }

  async sendAssessmentInvitation(id: string) {
    const assessment = await this.assessmentRepository.getAssessmentWithDetails(id);
    const details = assessment as any;
    if (!assessment || !details.application?.candidate || !details.application?.job) return;

    if (!assessment.invitation_token) {
      await this.assessmentRepository.update(id, {
        invitation_token: crypto.randomBytes(32).toString('hex'),
      });
    }

    const token = assessment.invitation_token || (await this.assessmentRepository.findById(id))?.invitation_token;
    const assessmentUrl = `${process.env.FRONTEND_URL}/assessment/${token}`;

    await emailService.sendAssessmentInvitationEmail({
      to: details.application.candidate.email,
      candidateName: `${details.application.candidate.first_name} ${details.application.candidate.last_name}`,
      jobTitle: details.application.job.title,
      companyName: (details.application.job as any).company?.name || 'Our Company',
      assessmentUrl,
      expiryDate: assessment.expiry_date || undefined,
    });

    return this.assessmentRepository.update(id, { status: 'INVITED' });
  }

  async resendAssessmentInvitation(id: string) {
    return this.sendAssessmentInvitation(id);
  }

  // --- Candidate Context Methods ---

  async getCandidateAssessments(candidateId: string) {
    return this.assessmentRepository.findByCandidate(candidateId);
  }

  async getAssessmentDetailsForCandidate(id: string, candidateId: string) {
    const assessment = await this.assessmentRepository.getAssessmentWithDetails(id);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    if (assessment.candidate_id !== candidateId) throw new HttpException(403, 'Unauthorized access to assessment');
    return assessment;
  }

  async startAssessmentForCandidate(id: string, candidateId: string) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    if (assessment.candidate_id !== candidateId) throw new HttpException(403, 'Unauthorized access to assessment');

    if (assessment.status === 'INVITED' || assessment.status === 'PENDING_INVITATION') {
      return this.assessmentRepository.update(assessment.id, {
        status: 'IN_PROGRESS',
        results: { ...(assessment.results as any), startedAt: new Date().toISOString() } as any
      });
    }
    return assessment;
  }

  async submitAssessmentForCandidate(id: string, candidateId: string, responses: Array<{ questionId: string; response: any }>) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    if (assessment.candidate_id !== candidateId) throw new HttpException(403, 'Unauthorized access to assessment');

    if (assessment.status === 'COMPLETED') {
      throw new HttpException(400, 'Assessment already completed');
    }

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
    const updated = await this.assessmentRepository.update(assessment.id, {
      status: 'COMPLETED',
      completed_at: new Date(),
    });

    // Score
    await this.scoreAssessment(assessment.id);

    return updated;
  }
}
