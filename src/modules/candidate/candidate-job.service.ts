import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';

export class CandidateJobService extends BaseService {

  async listJobs(skip: number, take: number) {
    return prisma.job.findMany({
      where: { status: 'OPEN' },
      select: {
        id: true,
        title: true,
        company: { select: { name: true } },
        location: true,
        employment_type: true,
        salary_min: true,
        salary_max: true,
        job_summary: true,
        posting_date: true
      },
      skip,
      take,
      orderBy: { posting_date: 'desc' }
    });
  }

  async getJobDetails(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: { select: { name: true } },
        job_round: { select: { id: true, name: true } }
      }
    });
  }

  async applyToJob(candidateId: string, jobId: string, data: any) {
    // Check if already applied
    const existing = await prisma.application.findFirst({
      where: { candidate_id: candidateId, job_id: jobId }
    });

    if (existing) {
      throw new HttpException(400, 'Already applied to this job');
    }

    // Create application
    return prisma.application.create({
      data: {
        candidate_id: candidateId,
        job_id: jobId,
        status: 'NEW',
        stage: 'NEW_APPLICATION',
        resume_url: data.resume_url,
        cover_letter_url: data.cover_letter_url,
        custom_answers: data.custom_answers || {},
        is_new: true,
        is_read: false
      }
    });
  }

  async saveJob(candidateId: string, jobId: string) {
    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new HttpException(404, 'Job not found');
    }

    // Upsert saved job
    return prisma.savedJob.upsert({
      where: {
        candidate_id_job_id: {
          candidate_id: candidateId,
          job_id: jobId
        }
      },
      update: {},
      create: {
        candidate_id: candidateId,
        job_id: jobId
      }
    });
  }

  async searchJobs(query: string, location: string, employmentType: string, skip: number, take: number) {
    return prisma.job.findMany({
      where: {
        status: 'OPEN',
        ...(query && {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        }),
        ...(location && { location: { contains: location, mode: 'insensitive' } }),
        ...(employmentType && { employment_type: employmentType as any })
      },
      select: {
        id: true,
        title: true,
        company: { select: { name: true } },
        location: true,
        employment_type: true,
        salary_min: true,
        salary_max: true,
        job_summary: true
      },
      skip,
      take,
      orderBy: { posting_date: 'desc' }
    });
  }

  async processJobAlerts(job: any): Promise<void> {
    // TODO: Implement job alert processing
  }
}

export const candidateJobService = new CandidateJobService();
