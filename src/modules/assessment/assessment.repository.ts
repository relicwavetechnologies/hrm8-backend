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
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  async findByInvitationToken(token: string): Promise<Assessment | null> {
    return this.prisma.assessment.findUnique({
      where: { invitation_token: token },
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

  // Questions
  async createQuestion(data: Prisma.AssessmentQuestionCreateInput): Promise<AssessmentQuestion> {
    return this.prisma.assessmentQuestion.create({ data });
  }

  async getQuestions(assessmentId: string): Promise<AssessmentQuestion[]> {
    return this.prisma.assessmentQuestion.findMany({
      where: { assessment_id: assessmentId },
      orderBy: { order: 'asc' },
    });
  }

  // Responses
  async createResponse(data: Prisma.AssessmentResponseCreateInput): Promise<AssessmentResponse> {
    return this.prisma.assessmentResponse.create({ data });
  }

  async getResponses(assessmentId: string): Promise<AssessmentResponse[]> {
    return this.prisma.assessmentResponse.findMany({
      where: { assessment_id: assessmentId },
    });
  }
}
