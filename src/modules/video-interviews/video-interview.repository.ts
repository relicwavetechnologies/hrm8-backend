import { BaseRepository } from '../../core/repository';
import { Prisma, VideoInterview } from '@prisma/client';
import { VideoInterviewData, VideoInterviewDetails } from './video-interview.model';

export class VideoInterviewRepository extends BaseRepository {
  async findById(id: string): Promise<VideoInterviewData | null> {
    return this.prisma.videoInterview.findUnique({
      where: { id },
      include: {
        application: {
          select: {
            id: true,
            job_id: true,
            candidate_id: true,
            status: true,
          },
        },
        interview_feedback: true,
      },
    });
  }

  async findByIdWithDetails(id: string): Promise<VideoInterviewDetails | null> {
    const interview = await this.prisma.videoInterview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
            job: {
              select: {
                id: true,
                title: true,
                company_id: true,
              },
            },
          },
        },
        interview_feedback: true,
      },
    });

    if (!interview) {
      return null;
    }

    return {
      ...interview,
      candidate: interview.application?.candidate
        ? {
            id: interview.application.candidate.id,
            firstName: interview.application.candidate.first_name,
            lastName: interview.application.candidate.last_name,
            email: interview.application.candidate.email,
          }
        : undefined,
      job: interview.application?.job
        ? {
            id: interview.application.job.id,
            title: interview.application.job.title,
            companyId: interview.application.job.company_id,
          }
        : undefined,
    };
  }

  async findByJobId(jobId: string): Promise<VideoInterviewData[]> {
    return this.prisma.videoInterview.findMany({
      where: { job_id: jobId },
      orderBy: { scheduled_date: 'asc' },
      include: {
        application: {
          select: {
            id: true,
            job_id: true,
            candidate_id: true,
            status: true,
          },
        },
        interview_feedback: true,
      },
    });
  }

  async delete(id: string): Promise<VideoInterview> {
    return this.prisma.videoInterview.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.videoInterview.count({
      where: { id },
    });
    return count > 0;
  }

  async getInterviewCreator(id: string): Promise<{ created_by?: string | null } | null> {
    return this.prisma.videoInterview.findUnique({
      where: { id },
      select: { created_by: true },
    });
  }
}

export const videoInterviewRepository = new VideoInterviewRepository();
