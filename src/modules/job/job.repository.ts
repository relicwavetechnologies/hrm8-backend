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
    const where: Prisma.JobWhereInput = {
      company_id: companyId,
    };

    // Only add status filter if explicitly provided
    if (filters.status && filters.status !== 'All Status' && filters.status !== '') {
      where.status = filters.status;
    }

    if (filters.department && filters.department !== 'All Departments') {
      where.department = filters.department;
    }

    if (filters.location && filters.location !== 'All Locations') {
      where.location = filters.location;
    }

    if (filters.hiringMode && filters.hiringMode !== 'All Modes') {
      where.hiring_mode = filters.hiringMode;
    }

    // Handle archiving logic
    if (filters.onlyArchived === 'true') {
      where.archived = true;
    } else if (filters.includeArchived !== 'true') {
      where.archived = false; // Default behavior: hide archived
    }

    // Add search filter if provided
    if (filters.search) {
      where.title = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    // Parse pagination
    const page = filters.page ? Number(filters.page) : 1;
    const limit = filters.limit ? Number(filters.limit) : 1000; // Default high limit for now
    const skip = (page - 1) * limit;

    return this.prisma.job.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            website: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<Job> {
    // Soft delete
    return this.prisma.job.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  async bulkDelete(jobIds: string[], companyId: string): Promise<number> {
    // Soft delete multiple jobs
    const result = await this.prisma.job.updateMany({
      where: {
        id: { in: jobIds },
        company_id: companyId,
      },
      data: { status: 'CLOSED' },
    });

    return result.count;
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
