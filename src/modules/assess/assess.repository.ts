import { BaseRepository } from '../../core/repository';
import type { Prisma, Job, Application } from '@prisma/client';

export class AssessRepository extends BaseRepository {
  async createInternalJob(data: any): Promise<Job> {
    return this.prisma.job.create({
      data: {
        ...data,
        status: 'DRAFT',
        hiring_mode: 'ASSESSMENT_ONLY',
      },
    });
  }

  async findMyJobs(companyId: string): Promise<any[]> {
    return this.prisma.job.findMany({
      where: {
        company_id: companyId,
        status: 'DRAFT',
      },
      include: {
        applications: {
          include: {
            candidate: true,
            application_round_progress: {
              include: {
                job_round: true,
              },
            },
          },
        },
        job_round: {
          where: {
            type: 'ASSESSMENT',
          },
          include: {
            assessment_configuration: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findJobWithCandidates(jobId: string, companyId: string): Promise<any> {
    return this.prisma.job.findFirst({
      where: {
        id: jobId,
        company_id: companyId,
      },
      include: {
        applications: {
          include: {
            candidate: true,
            application_round_progress: {
              include: {
                job_round: true,
              },
            },
          },
        },
        job_round: {
          include: {
            assessment_configuration: true,
          },
        },
      },
    });
  }

  async findCompanyBalance(companyId: string): Promise<number> {
    const account = await this.prisma.virtualAccount.findUnique({
      where: {
        owner_type_owner_id: {
          owner_type: 'COMPANY',
          owner_id: companyId,
        },
      },
      select: { balance: true },
    });
    return account?.balance || 0;
  }

  async updateCompanyBalance(companyId: string, amount: number): Promise<any> {
    return this.prisma.virtualAccount.upsert({
      where: {
        owner_type_owner_id: {
          owner_type: 'COMPANY',
          owner_id: companyId,
        },
      },
      create: {
        owner_type: 'COMPANY',
        owner_id: companyId,
        balance: amount,
      },
      update: {
        balance: { increment: amount },
      },
    });
  }

  async findById(id: string): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: { id },
    });
  }

  async addCandidateToJob(jobId: string, candidateData: any): Promise<Application> {
    // 1. Find or create candidate
    const candidate = await this.prisma.candidate.upsert({
      where: { email: candidateData.email.toLowerCase() },
      create: {
        first_name: candidateData.firstName,
        last_name: candidateData.lastName,
        email: candidateData.email.toLowerCase(),
        phone: candidateData.phone || candidateData.mobile,
        password_hash: 'MANUAL_ENTRY', // Standard for candidates added this way
      },
      update: {
        first_name: candidateData.firstName,
        last_name: candidateData.lastName,
        phone: candidateData.phone || candidateData.mobile,
      },
    });

    // 2. Create application
    return this.prisma.application.create({
      data: {
        job: { connect: { id: jobId } },
        candidate: { connect: { id: candidate.id } },
        status: 'NEW',
        stage: 'NEW_APPLICATION',
        resume_url: candidateData.resumeUrl,
        manually_added: true,
        added_by: candidateData.addedBy,
        added_at: new Date(),
      },
    });
  }

  async moveCandidate(applicationId: string, data: { stage: any; status: any }): Promise<Application> {
    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: data.stage,
        status: data.status,
        updated_at: new Date(),
      },
    });
  }
}
