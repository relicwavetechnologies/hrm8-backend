import type { Prisma, Application, ApplicationStatus, ApplicationStage } from '@prisma/client';
import { BaseRepository } from '../../core/repository';
import { ApplicationFilters } from './application.model';

export class ApplicationRepository extends BaseRepository {

  async create(data: Prisma.ApplicationCreateInput): Promise<Application> {
    return this.prisma.application.create({ data });
  }

  async update(id: string, data: Prisma.ApplicationUpdateInput): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Application | null> {
    return this.prisma.application.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            photo: true,
            linked_in_url: true,
            city: true,
            state: true,
            country: true,
            email_verified: true,
            status: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findByCandidateId(candidateId: string): Promise<Application[]> {
    return this.prisma.application.findMany({
      where: { candidate_id: candidateId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            location: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByJobId(jobId: string, filters?: ApplicationFilters): Promise<Application[]> {
    const where: any = { job_id: jobId };

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.stage) where.stage = filters.stage;
      if (filters.minScore !== undefined) where.score = { gte: filters.minScore };
      if (filters.maxScore !== undefined) {
        where.score = where.score ? { ...where.score, lte: filters.maxScore } : { lte: filters.maxScore };
      }
      if (filters.shortlisted !== undefined) where.shortlisted = filters.shortlisted;
    }

    return this.prisma.application.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            photo: true,
            linked_in_url: true,
            city: true,
            state: true,
            country: true,
            email_verified: true,
            status: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { shortlisted: 'desc' },
        { score: 'desc' },
        { created_at: 'desc' },
      ],
    });
  }

  async checkExistingApplication(candidateId: string, jobId: string): Promise<boolean> {
    const count = await this.prisma.application.count({
      where: {
        candidate_id: candidateId,
        job_id: jobId,
      },
    });
    return count > 0;
  }

  async delete(id: string): Promise<Application> {
    return this.prisma.application.delete({
      where: { id },
    });
  }

  async updateScore(id: string, score: number): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: { score },
    });
  }

  async updateRank(id: string, rank: number): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: { rank },
    });
  }

  async updateTags(id: string, tags: string[]): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: { tags },
    });
  }

  async shortlist(id: string, userId: string): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: {
        shortlisted: true,
        shortlisted_at: new Date(),
        shortlisted_by: userId,
      },
    });
  }

  async unshortlist(id: string): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: {
        shortlisted: false,
        shortlisted_at: null,
        shortlisted_by: null,
      },
    });
  }

  async updateStage(id: string, stage: ApplicationStage): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: { stage },
    });
  }

  async updateNotes(id: string, notes: string): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: { recruiter_notes: notes },
    });
  }

  async countByJobId(jobId: string): Promise<number> {
    return this.prisma.application.count({
      where: { job_id: jobId },
    });
  }

  async countUnreadByJobId(jobId: string): Promise<number> {
    return this.prisma.application.count({
      where: {
        job_id: jobId,
        is_read: false,
      },
    });
  }

  async markAsRead(id: string): Promise<Application> {
    return this.prisma.application.update({
      where: { id },
      data: {
        is_read: true,
        is_new: false,
      },
    });
  }

  async bulkUpdateScore(applicationIds: string[], scores: Record<string, number>): Promise<number> {
    // Update scores in a transaction
    const updatePromises = applicationIds.map((id) =>
      this.prisma.application.update({
        where: { id },
        data: { score: scores[id] },
      })
    );

    const results = await this.prisma.$transaction(updatePromises);
    return results.length;
  }
}
