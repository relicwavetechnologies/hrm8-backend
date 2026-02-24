import { BaseService } from '../../core/service';
import { AssessmentRepository } from './assessment.repository';
import { Assessment, AssessmentStatus, ActorType, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { env } from '../../config/env';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { gmailService } from '../integration/gmail.service';
import { prisma } from '../../utils/prisma';
import { EmailTemplateService } from '../email/email-template.service';
import { ApplicationActivityService } from '../application/application-activity.service';

const notificationService = new NotificationService(new NotificationRepository());

export class AssessmentService extends BaseService {
  constructor(private assessmentRepository: AssessmentRepository) {
    super();
  }

  private async logAssessmentActivity(input: {
    applicationId?: string | null;
    actorId?: string;
    actorType?: ActorType;
    action:
    | 'assessment_invited'
    | 'assessment_started'
    | 'assessment_response_saved'
    | 'assessment_submitted'
    | 'assessment_resend'
    | 'assessment_graded'
    | 'assessment_vote_added'
    | 'assessment_comment_added'
    | 'assessment_finalized'
    | 'email_sent';
    subject: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!input.applicationId) return;
    await ApplicationActivityService.logSafe({
      applicationId: input.applicationId,
      actorId: input.actorId,
      actorType: input.actorType,
      action: input.action,
      subject: input.subject,
      description: input.description,
      metadata: input.metadata,
    });
  }

  private buildAssessmentEmailHtml(data: {
    candidateName: string;
    jobTitle: string;
    assessmentUrl: string;
    expiryDate?: Date;
  }) {
    return `
      <p>Hi ${data.candidateName},</p>
      <p>You have been invited to complete an assessment for the <strong>${data.jobTitle}</strong> position.</p>
      <p>Please complete the assessment by clicking the link below:</p>
      <p><a href="${data.assessmentUrl}">Start Assessment</a></p>
      <p style="font-size: 12px; color: #666;">Legacy URL: ${data.assessmentUrl}</p>
      ${data.expiryDate ? `<p>This link expires on ${data.expiryDate.toLocaleString()}</p>` : ''}
      <p>Good luck!</p>
    `;
  }

  private interpolateTemplate(template: string, variables: Record<string, any>) {
    return template.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => (obj || {})[k], variables);
      return value !== undefined && value !== null ? String(value) : match;
    });
  }

  private async logEmailIfPossible(data: {
    applicationId: string;
    userId: string;
    toEmail: string;
    subject: string;
    body: string;
    templateId?: string;
    status?: 'SENT' | 'FAILED';
  }) {
    try {
      const prismaAny = prisma as any;
      if (!prismaAny?.emailLog?.create) return;
      await prismaAny.emailLog.create({
        data: {
          id: crypto.randomUUID(),
          application_id: data.applicationId,
          user_id: data.userId,
          to_email: data.toEmail,
          subject: data.subject,
          body: data.body,
          template_id: data.templateId,
          status: data.status || 'SENT',
        },
      });
    } catch (error) {
      console.error('[AssessmentService] Failed to log assessment email', error);
    }
  }

  private async sendAssessmentInviteViaUserEmail(params: {
    applicationId: string;
    inviterUserId: string;
    companyId?: string | null;
    to: string;
    candidateName: string;
    jobTitle: string;
    assessmentUrl: string;
    expiryDate?: Date;
    templateId?: string;
    candidateId?: string;
    jobId?: string;
  }): Promise<void> {
    const subjectDefault = `Assessment Invitation: ${params.jobTitle}`;
    const bodyDefault = this.buildAssessmentEmailHtml({
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      assessmentUrl: params.assessmentUrl,
      expiryDate: params.expiryDate,
    });

    let subject = subjectDefault;
    let body = bodyDefault;

    if (params.templateId) {
      try {
        const template = await EmailTemplateService.findOne(params.templateId);
        if (template) {
          const vars = {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            assessmentUrl: params.assessmentUrl,
            assessment_url: params.assessmentUrl,
            expiryDate: params.expiryDate?.toLocaleString?.() || '',
          };
          subject = this.interpolateTemplate(template.subject || subjectDefault, vars);
          body = this.interpolateTemplate(template.body || bodyDefault, vars);
        }
      } catch (error) {
        console.error('[AssessmentService] Failed to hydrate template, using default assessment email', error);
      }
    }

    const sender = await prisma.user.findUnique({
      where: { id: params.inviterUserId },
      select: { email: true },
    });

    if (!sender?.email || !params.companyId) {
      throw new HttpException(400, 'Gmail is not connected for this user. Connect Gmail to send assessment emails.');
    }

    const gmailResult = await gmailService.sendEmail(params.inviterUserId, params.companyId, {
      to: params.to,
      subject,
      body,
      senderEmail: sender.email,
    });

    if (!gmailResult.success) {
      if (gmailResult.needsFallback) {
        throw new HttpException(400, 'Gmail send permission missing. Reconnect Gmail and grant Gmail send access.');
      }
      throw new HttpException(500, gmailResult.error || 'Failed to send assessment email via Gmail API');
    }

    await this.logEmailIfPossible({
      applicationId: params.applicationId,
      userId: params.inviterUserId,
      toEmail: params.to,
      subject,
      body,
      templateId: params.templateId,
      status: 'SENT',
    });

    await this.logAssessmentActivity({
      applicationId: params.applicationId,
      actorId: params.inviterUserId,
      action: 'email_sent',
      subject: 'Assessment invitation email sent',
      description: `Assessment invitation sent to ${params.to}`,
      metadata: {
        to: params.to,
        subject,
        templateId: params.templateId,
        candidateId: params.candidateId,
        jobId: params.jobId,
      },
    });
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
            question_type: q.type || q.question_type || 'MULTIPLE_CHOICE',
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
      const updated = await this.assessmentRepository.update(assessment.id, {
        status: 'IN_PROGRESS',
        started_at: new Date(),
      });
      await this.logAssessmentActivity({
        applicationId: updated.application_id,
        actorType: ActorType.SYSTEM,
        action: 'assessment_started',
        subject: 'Assessment started',
        description: 'Candidate started the assessment',
        metadata: {
          assessmentId: updated.id,
          invitationToken: token,
        },
      });
      return updated;
    }
    return assessment;
  }

  async saveResponse(token: string, questionId: string, response: any) {
    const assessment = await this.assessmentRepository.findByInvitationToken(token);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    if (assessment.status === 'COMPLETED' || assessment.status === 'EXPIRED') {
      throw new HttpException(400, 'Assessment is already submitted or expired');
    }

    const saved = await this.assessmentRepository.upsertResponse(
      assessment.id,
      questionId,
      assessment.candidate_id,
      response
    );
    await this.logAssessmentActivity({
      applicationId: assessment.application_id,
      actorType: ActorType.SYSTEM,
      action: 'assessment_response_saved',
      subject: 'Assessment response saved',
      description: 'Candidate saved an assessment response',
      metadata: {
        assessmentId: assessment.id,
        questionId,
      },
    });
    return saved;
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
    const updated = await this.assessmentRepository.update(assessment.id, {
      status: 'COMPLETED',
      completed_at: new Date(),
    });
    await this.logAssessmentActivity({
      applicationId: updated.application_id,
      actorType: ActorType.SYSTEM,
      action: 'assessment_submitted',
      subject: 'Assessment submitted',
      description: 'Candidate submitted the assessment',
      metadata: {
        assessmentId: updated.id,
        responseCount: responses?.length || 0,
      },
    });
    return updated;
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

    await this.notifyCandidateAssessmentInvitation({
      assessmentId: assessment.id,
      candidateId: application.candidate_id,
      applicationId,
      jobId: application.job_id,
      expiryDate
    });

    // Link to progress
    await this.assessmentRepository.linkToRoundProgress(applicationId, jobRoundId, assessment.id);

    // Create questions from config
    if (config.questions && Array.isArray(config.questions)) {
      const questionData = (config.questions as any[]).map((q, index) => ({
        assessment_id: assessment.id,
        question_text: q.text || q.question_text || '',
        question_type: q.type || q.question_type || 'MULTIPLE_CHOICE',
        options: q.options || null,
        points: q.points || 1,
        order: q.order !== undefined ? q.order : index
      }));
      await this.assessmentRepository.createManyQuestions(questionData);
    }

    await this.logAssessmentActivity({
      applicationId,
      actorId: invitedBy,
      action: 'assessment_invited',
      subject: 'Assessment assigned',
      description: 'Round assessment assigned to candidate',
      metadata: {
        assessmentId: assessment.id,
        jobRoundId,
        provider: assessment.provider,
        expiryDate,
        questionCount: Array.isArray(config.questions) ? config.questions.length : 0,
        source: 'auto_round',
      },
    });

    // Send email: use round's custom template if configured, else default
    try {
      const candidateName = `${application.candidate.first_name} ${application.candidate.last_name}`;
      const jobTitle = application.job.title;
      const assessmentUrl = `${env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;
      const round = await this.assessmentRepository.findJobRoundWithEmailConfig(jobRoundId);
      const emailConfig = round?.email_config as { enabled?: boolean; templateId?: string } | null;

      await this.sendAssessmentInviteViaUserEmail({
        applicationId,
        inviterUserId: invitedBy,
        companyId: application.job.company_id,
        to: application.candidate.email,
        candidateName,
        jobTitle,
        assessmentUrl,
        expiryDate,
        templateId: emailConfig?.enabled ? emailConfig.templateId : undefined,
        candidateId: application.candidate_id,
        jobId: application.job_id,
      });
    } catch (error) {
      console.error(`[AssessmentService] Failed to send email to ${application.candidate.email}`, error);
      // We don't fail the assignment if email fails, but we should log it
    }
  }

  // Manual invite - works without requiring assessment config to be enabled
  async manualInviteToAssessment(
    applicationId: string,
    invitedBy: string,
    options?: {
      deadlineDays?: number;
      questions?: Array<{
        questionText?: string;
        text?: string;
        type?: string;
        options?: any;
        points?: number;
        order?: number;
      }>;
      templateId?: string;
    }
  ): Promise<{ success: boolean, assessmentId?: string, error?: string }> {
    // Get application details
    const application = await this.assessmentRepository.findApplicationForAssignment(applicationId);
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Calculate expiry (7 days default for direct assessments)
    let expiryDate: Date = new Date();
    const finalDeadlineDays = options?.deadlineDays || 7;
    expiryDate.setDate(expiryDate.getDate() + finalDeadlineDays);

    // Create assessment
    const assessment = await this.assessmentRepository.create({
      user: { connect: { id: invitedBy } },
      application: { connect: { id: applicationId } },
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      job_round_id: null,
      assessment_type: 'SKILLS_BASED',
      provider: 'native',
      invited_at: new Date(),
      expiry_date: expiryDate,
      pass_threshold: 70,
      status: 'INVITED',
      invitation_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    });

    // Create questions from request payload
    if (options?.questions && Array.isArray(options.questions) && options.questions.length > 0) {
      const questionData = options.questions.map((q, index) => ({
        assessment_id: assessment.id,
        question_text: q.questionText || q.text || '',
        question_type: q.type || 'MULTIPLE_CHOICE',
        options: q.options || null,
        points: q.points || 1,
        order: q.order !== undefined ? q.order : index
      }));
      await this.assessmentRepository.createManyQuestions(questionData);
    }

    // Send email via Gmail API only
    try {
      const candidateName = `${application.candidate.first_name} ${application.candidate.last_name}`;
      const jobTitle = application.job.title;
      const assessmentUrl = `${env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;
      await this.sendAssessmentInviteViaUserEmail({
        applicationId,
        inviterUserId: invitedBy,
        companyId: application.job.company_id,
        to: application.candidate.email,
        candidateName,
        jobTitle,
        assessmentUrl,
        expiryDate,
        templateId: options?.templateId,
        candidateId: application.candidate_id,
        jobId: application.job_id,
      });
    } catch (error) {
      console.error(`[AssessmentService] Failed to send assessment email via Gmail to ${application.candidate.email}`, error);
      try {
        await prisma.assessment.delete({ where: { id: assessment.id } });
      } catch (cleanupError) {
        console.error('[AssessmentService] Failed to rollback assessment after Gmail send failure', cleanupError);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send assessment email via Gmail',
      };
    }

    await this.logAssessmentActivity({
      applicationId,
      actorId: invitedBy,
      action: 'assessment_invited',
      subject: 'Direct assessment created',
      description: 'Direct assessment created and invitation sent',
      metadata: {
        assessmentId: assessment.id,
        expiryDate,
        questionCount: options?.questions?.length || 0,
        source: 'manual_direct',
      },
    });

    return { success: true, assessmentId: assessment.id };
  }

  private async notifyCandidateAssessmentInvitation(params: {
    assessmentId: string;
    candidateId: string;
    applicationId: string;
    jobId: string;
    expiryDate?: Date;
  }): Promise<void> {
    try {
      await notificationService.createNotification({
        recipientType: NotificationRecipientType.CANDIDATE,
        recipientId: params.candidateId,
        type: UniversalNotificationType.SYSTEM_ANNOUNCEMENT,
        title: 'New Assessment Assigned',
        message: 'A new assessment has been assigned to your application. Complete it to continue in the hiring process.',
        data: {
          assessmentId: params.assessmentId,
          applicationId: params.applicationId,
          jobId: params.jobId,
          notificationSubtype: 'ASSESSMENT_INVITED',
          expiryDate: params.expiryDate?.toISOString() || null
        },
        actionUrl: `/candidate/assessments/${params.assessmentId}`,
        skipEmail: true
      });
    } catch (error) {
      console.error('[AssessmentService] Failed to create in-app assessment notification', error);
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

    // Map assessments and filter out moved candidates
    const mappedAssessments = assessments.map(a => {
      const app = a.application as any;
      const name = app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '';
      const email = app?.candidate?.email || '';

      // Check if candidate has moved to a later round
      const hasLaterRound = app?.application_round_progress?.some(
        (p: any) => p.job_round && p.job_round.order > currentRound.order
      ) || false;

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

  async getApplicationAssessments(applicationId: string) {
    const assessments = await this.assessmentRepository.findByApplicationIdWithDetails(applicationId);
    const roundIds = Array.from(new Set(assessments.map((a: any) => a.job_round_id).filter(Boolean)));
    const rounds = roundIds.length
      ? await prisma.jobRound.findMany({
        where: { id: { in: roundIds as string[] } },
        select: { id: true, name: true },
      })
      : [];
    const roundNameById = new Map(rounds.map((r) => [r.id, r.name]));

    return assessments.map((a: any) => {
      const app = a.application as any;
      const name = app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '';
      const email = app?.candidate?.email || '';

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
        isMovedToNextRound: false,
        isFinalized: a.status === 'COMPLETED' && averageScore !== null,
        applicationStage: app?.stage,
        roundId: a.job_round_id || null,
        roundName: a.job_round_id ? roundNameById.get(a.job_round_id) || 'Assessment Round' : 'Direct Assessment',
      };
    });
  }

  async getGradingDetails(assessmentId: string) {
    const assessment = await this.assessmentRepository.getGradingData(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    let config = null;
    if (assessment.job_round_id) {
      config = await this.assessmentRepository.findConfigByJobRoundId(assessment.job_round_id);
    }
    return { ...assessment, assessmentConfig: config };
  }

  async saveGrade(assessmentId: string, grades: Array<{ questionId: string; score: number | null; feedback?: string }>, graderId: string) {
    const assessment = await this.assessmentRepository.getGradingData(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    for (const g of grades) {
      const response = assessment.assessment_response.find(r => r.question_id === g.questionId);
      if (response) {
        await this.assessmentRepository.upsertGrade(response.id, graderId, g.score ?? 0, g.feedback ?? '');
      }
    }
    await this.logAssessmentActivity({
      applicationId: assessment.application_id,
      actorId: graderId,
      action: 'assessment_graded',
      subject: 'Assessment grading saved',
      description: 'Assessment grades were saved',
      metadata: {
        assessmentId,
        gradedQuestions: grades.length,
      },
    });
    return { message: 'Grades saved' };
  }

  async saveVote(assessmentId: string, vote: 'APPROVE' | 'REJECT', comment: string | undefined, userId: string) {
    const assessment = await this.assessmentRepository.findById(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    await this.assessmentRepository.upsertAssessmentVote(assessmentId, userId, vote, comment);
    await this.logAssessmentActivity({
      applicationId: assessment.application_id,
      actorId: userId,
      action: 'assessment_vote_added',
      subject: 'Assessment vote saved',
      description: `Assessment vote recorded: ${vote}`,
      metadata: {
        assessmentId,
        vote,
        hasComment: !!comment,
      },
    });
    return { message: 'Vote saved' };
  }

  async addComment(assessmentId: string, comment: string, userId: string) {
    const assessment = await this.assessmentRepository.findById(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');
    const created = await this.assessmentRepository.addComment(assessmentId, userId, comment);
    await this.logAssessmentActivity({
      applicationId: assessment.application_id,
      actorId: userId,
      action: 'assessment_comment_added',
      subject: 'Assessment comment added',
      description: 'Assessment comment added by reviewer',
      metadata: {
        assessmentId,
        commentId: (created as any)?.id,
      },
    });
    return created;
  }

  async finalizeAssessment(assessmentId: string) {
    const assessment = await this.assessmentRepository.getGradingData(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    const config = assessment.job_round_id
      ? await this.assessmentRepository.findConfigByJobRoundId(assessment.job_round_id)
      : null;
    const evaluationMode = (config as any)?.evaluation_mode || 'GRADING';

    let passed = false;

    if (evaluationMode === 'VOTING') {
      const votes = (assessment as any).assessment_vote || [];
      const approves = votes.filter((v: any) => v.vote === 'APPROVE').length;
      const rejects = votes.filter((v: any) => v.vote === 'REJECT').length;
      const votingRule = (config as any)?.voting_rule || 'MAJORITY';
      const minApprovals = (config as any)?.min_approvals_count ?? 1;

      if (votingRule === 'UNANIMOUS') {
        passed = votes.length > 0 && rejects === 0;
      } else if (votingRule === 'MAJORITY') {
        passed = approves > rejects;
      } else if (votingRule === 'MIN_APPROVALS') {
        passed = approves >= minApprovals;
      } else {
        passed = approves > rejects;
      }

      await this.assessmentRepository.update(assessment.id, {
        status: 'COMPLETED',
        completed_at: assessment.completed_at || new Date(),
        results: { passed, voteCount: votes.length, approves, rejects }
      });
    } else {
      // Grading: Calculate Average Score
      let averageScore = 0;
      if (assessment.assessment_response && assessment.assessment_response.length > 0) {
        const grades = assessment.assessment_response
          .flatMap((r: any) => r.assessment_grade || [])
          .filter((g: any) => g.score !== null && g.score !== undefined);

        if (grades.length > 0) {
          const sum = grades.reduce((acc: number, curr: any) => acc + curr.score, 0);
          averageScore = Number((sum / grades.length).toFixed(2));
        }
      }

      const passThreshold = config?.pass_threshold || 70;
      passed = averageScore >= passThreshold;

      await this.assessmentRepository.update(assessment.id, {
        status: 'COMPLETED',
        completed_at: assessment.completed_at || new Date(),
        results: { score: averageScore, passed }
      });
    }

    // Automation Logic
    let automationAction: 'auto_reject' | 'auto_move' | null = null;
    if (assessment.job_round_id && config) {
      if ((config as any).auto_reject_on_fail && !passed) {
        await this.assessmentRepository.rejectApplication(assessment.application_id);
        automationAction = 'auto_reject';
      } else if ((config as any).auto_move_on_pass && passed) {
        await this.assessmentRepository.moveToNextRound(assessment.application_id, assessment.job_round_id);
        automationAction = 'auto_move';
      }
    }

    await this.logAssessmentActivity({
      applicationId: assessment.application_id,
      action: 'assessment_finalized',
      subject: 'Assessment finalized',
      description: passed ? 'Assessment finalized as passed' : 'Assessment finalized as failed',
      metadata: {
        assessmentId,
        passed,
        evaluationMode,
        automationAction,
      },
    });

    return { success: true, passed };
  }

  async resendInvitation(assessmentId: string, requestedByUserId?: string): Promise<void> {
    const assessment = await this.assessmentRepository.findWithCandidateDetails(assessmentId);
    if (!assessment) throw new HttpException(404, 'Assessment not found');

    // Reset invited_at
    await this.assessmentRepository.update(assessment.id, {
      invited_at: new Date()
    });

    if (assessment.application) {
      const inviterUserId = requestedByUserId || (assessment as any).invited_by;
      if (!inviterUserId) {
        throw new HttpException(400, 'Cannot resend assessment: inviter user not found');
      }

      const candidateName = `${assessment.application.candidate.first_name} ${assessment.application.candidate.last_name}`;
      const jobTitle = assessment.application.job.title;
      const assessmentUrl = `${env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;
      await this.sendAssessmentInviteViaUserEmail({
        applicationId: assessment.application_id,
        inviterUserId,
        companyId: assessment.application.job.company_id,
        to: assessment.application.candidate.email,
        candidateName,
        jobTitle,
        assessmentUrl,
        expiryDate: assessment.expiry_date || undefined,
        candidateId: assessment.candidate_id,
        jobId: assessment.job_id,
      });

      await this.logAssessmentActivity({
        applicationId: assessment.application_id,
        actorId: inviterUserId,
        action: 'assessment_resend',
        subject: 'Assessment invitation resent',
        description: 'Assessment invitation email was resent',
        metadata: {
          assessmentId,
        },
      });
    }
  }
}
