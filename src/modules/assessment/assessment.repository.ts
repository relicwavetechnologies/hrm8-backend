import type { Prisma, Assessment, AssessmentQuestion, AssessmentResponse } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class AssessmentRepository extends BaseRepository {
  async create(data: Prisma.AssessmentCreateInput): Promise<Assessment> {
    return this.prisma.assessment.create({ data });
  }

  async update(id: string, data: Prisma.AssessmentUpdateInput): Promise<Assessment> {
    return this.prisma.assessment.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Assessment | null> {
    return this.prisma.assessment.findUnique({
      where: { id },
      include: {
        assessment_question: {
          orderBy: { order: 'asc' },
        },
        assessment_response: true,
        assessment_comment: {
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async getAssessmentWithDetails(id: string): Promise<Assessment | null> {
    return this.prisma.assessment.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: true,
            job: true,
          },
        },
        assessment_question: {
          orderBy: { order: 'asc' },
        },
        assessment_response: true,
        assessment_comment: {
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async createComment(data: any) {
    return this.prisma.assessmentComment.create({ data });
  }

  async updateResponse(id: string, data: any) {
    return this.prisma.assessmentResponse.update({
      where: { id },
      data,
    });
  }

  async findByInvitationToken(token: string): Promise<Assessment | null> {
    return this.prisma.assessment.findUnique({
      where: { invitation_token: token },
      include: {
        assessment_question: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findByApplicationAndRound(applicationId: string, jobRoundId: string): Promise<Assessment | null> {
    return this.prisma.assessment.findFirst({
      where: {
        application_id: applicationId,
        job_round_id: jobRoundId,
      },
    });
  }

  async findJobRound(id: string) {
    return this.prisma.jobRound.findUnique({
      where: { id },
      select: { order: true },
    });
  }

  async findByRoundIdWithDetails(roundId: string) {
    return this.prisma.assessment.findMany({
      where: { job_round_id: roundId },
      include: {
        assessment_question: true,
        assessment_response: {
          include: {
            assessment_grade: true,
          },
        },
        application: {
          include: {
            candidate: true,
            application_round_progress: {
              include: {
                job_round: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Questions
  async createQuestion(data: Prisma.AssessmentQuestionCreateInput): Promise<AssessmentQuestion> {
    return this.prisma.assessmentQuestion.create({ data });
  }

  async createManyQuestions(data: Prisma.AssessmentQuestionCreateManyInput[]) {
    return this.prisma.assessmentQuestion.createMany({ data });
  }

  async getQuestions(assessmentId: string): Promise<AssessmentQuestion[]> {
    return this.prisma.assessmentQuestion.findMany({
      where: { assessment_id: assessmentId },
      orderBy: { order: 'asc' },
    });
  }

  // Configurations
  async findConfiguration(jobRoundId: string) {
    return this.prisma.assessmentConfiguration.findUnique({
      where: { job_round_id: jobRoundId },
    });
  }

  async upsertConfiguration(jobRoundId: string, data: any) {
    return this.prisma.assessmentConfiguration.upsert({
      where: { job_round_id: jobRoundId },
      create: {
        ...data,
        job_round: { connect: { id: jobRoundId } },
      },
      update: data,
    });
  }

  async findByRound(jobRoundId: string): Promise<Assessment[]> {
    return this.prisma.assessment.findMany({
      where: { job_round_id: jobRoundId },
      include: {
        application: {
          include: {
            candidate: true,
          },
        },
      },
    });
  }

  // Responses
  async createResponse(data: Prisma.AssessmentResponseCreateInput): Promise<AssessmentResponse> {
    return this.prisma.assessmentResponse.create({ data });
  }

  async upsertResponse(
    assessmentId: string,
    questionId: string,
    candidateId: string,
    response: any
  ): Promise<AssessmentResponse> {
    return this.prisma.assessmentResponse.upsert({
      where: {
        response_identifier: {
          assessment_id: assessmentId,
          question_id: questionId,
        },
      },
      create: {
        assessment: { connect: { id: assessmentId } },
        assessment_question: { connect: { id: questionId } },
        candidate_id: candidateId,
        response: response,
      },
      update: {
        response: response,
        answered_at: new Date(),
      },
    });
  }

  async deleteResponses(assessmentId: string) {
    return this.prisma.assessmentResponse.deleteMany({
      where: { assessment_id: assessmentId },
    });
  }

  async deleteQuestions(assessmentId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.assessmentQuestion.deleteMany({
      where: { assessment_id: assessmentId },
    });
  }

  async createAssessmentConfig(data: Prisma.AssessmentConfigurationCreateInput) {
    return this.prisma.assessmentConfiguration.create({ data });
  }

  async updateAssessmentConfig(id: string, data: Prisma.AssessmentConfigurationUpdateInput) {
    return this.prisma.assessmentConfiguration.update({
      where: { id },
      data,
    });
  }

  async findConfigByJobRoundId(jobRoundId: string) {
    return this.prisma.assessmentConfiguration.findUnique({
      where: { job_round_id: jobRoundId },
    });
  }

  async createGrade(data: Prisma.AssessmentGradeCreateInput) {
    return this.prisma.assessmentGrade.create({ data });
  }

  async upsertGrade(responseId: string, graderId: string, score: number, feedback?: string) {
    return this.prisma.assessmentGrade.upsert({
      where: {
        response_id_grader_id: {
          response_id: responseId,
          grader_id: graderId,
        },
      },
      create: {
        assessment_response: { connect: { id: responseId } },
        grader: { connect: { id: graderId } },
        score,
        feedback,
      },
      update: {
        score,
        feedback,
      },
    });
  }

  async addComment(assessmentId: string, userId: string, comment: string) {
    return this.prisma.assessmentComment.create({
      data: {
        assessment: { connect: { id: assessmentId } },
        user: { connect: { id: userId } },
        comment,
      },
    });
  }

  async getGradingData(assessmentId: string) {
    return this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessment_response: {
          include: {
            assessment_question: true,
            assessment_grade: true,
          },
        },
      },
    });
  }

  async linkToRoundProgress(applicationId: string, jobRoundId: string, assessmentId: string) {
    await this.prisma.applicationRoundProgress.updateMany({
      where: {
        application_id: applicationId,
        job_round_id: jobRoundId,
      },
      data: {
        assessment_id: assessmentId,
      },
    });
  }

  async findApplicationForAssignment(applicationId: string) {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        job: true,
      },
    });
  }

  async assignAssessmentToRoundProgress(applicationId: string, jobRoundId: string, assessmentId: string) {
    return this.prisma.applicationRoundProgress.update({
      where: {
        application_id_job_round_id: {
          application_id: applicationId,
          job_round_id: jobRoundId,
        },
      },
      data: { assessment_id: assessmentId },
    });
  }

  async moveToNextRound(applicationId: string, currentRoundId: string) {
    const currentRound = await this.findJobRound(currentRoundId);
    if (!currentRound) return null;

    const nextRound = await this.prisma.jobRound.findFirst({
      where: {
        job_id: (await this.prisma.jobRound.findUnique({ where: { id: currentRoundId } }))?.job_id,
        order: { gt: currentRound.order },
      },
      orderBy: { order: 'asc' },
    });

    if (!nextRound) return null;

    return this.prisma.applicationRoundProgress.upsert({
      where: {
        application_id_job_round_id: {
          application_id: applicationId,
          job_round_id: nextRound.id,
        },
      },
      create: {
        application_id: applicationId,
        job_round_id: nextRound.id,
        completed: false,
      },
      update: {
        completed: false,
      },
    });
  }

  async rejectApplication(applicationId: string) {
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { stage: 'REJECTED', status: 'REJECTED' },
    });
  }

  async findAssessmentsByCandidate(candidateId: string) {
    return this.prisma.assessment.findMany({
      where: { candidate_id: candidateId },
      include: {
        job: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
