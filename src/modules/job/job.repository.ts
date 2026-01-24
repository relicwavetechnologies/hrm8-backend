import type { Prisma, Job } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class JobRepository extends BaseRepository {
  
  async create(data: Prisma.JobCreateInput): Promise<Job> {
    return this.prisma.job.create({ data });
  }

  async update(id: string, data: Prisma.JobUpdateInput): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: { id },
    });
  }

  async findByCompanyId(companyId: string): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByCompanyIdWithFilters(companyId: string, filters: any): Promise<Job[]> {
    const where: any = { company_id: companyId, ...filters };
    return this.prisma.job.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async delete(id: string): Promise<Job> {
    // Soft delete
    return this.prisma.job.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.prisma.job.count({
      where: { company_id: companyId },
    });
  }

  async findPublicJobs(filters: any, limit: number = 50, offset: number = 0): Promise<{ jobs: Job[], total: number }> {
    const where: any = {
      status: 'OPEN',
      visibility: 'public',
      archived: false,
      OR: [
        { expires_at: null },
        { expires_at: { gte: new Date() } }
      ],
      ...filters
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: [
          { featured: 'desc' },
          { posting_date: 'desc' }
        ],
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              website: true,
              careers_page_logo: true
            }
          }
        }
      }),
      this.prisma.job.count({ where })
    ]);

    return { jobs, total };
  }
}
