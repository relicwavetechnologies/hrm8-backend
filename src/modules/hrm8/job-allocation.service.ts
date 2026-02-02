import { BaseService } from '../../core/service';
import { JobAllocationRepository } from './job-allocation.repository';
import { HttpException } from '../../core/http-exception';
import { AssignmentSource, PipelineStage } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class JobAllocationService extends BaseService {
  constructor(private jobAllocationRepository: JobAllocationRepository) {
    super();
  }

  async allocate(data: {
    jobId: string;
    consultantId: string;
    assignedBy: string;
    source?: AssignmentSource;
  }) {
    const consultant = await prisma.consultant.findUnique({
      where: { id: data.consultantId },
      select: { region_id: true },
    });

    if (!consultant || !consultant.region_id) {
      throw new HttpException(404, 'Consultant not found or not assigned to a region');
    }

    return this.jobAllocationRepository.assignToConsultant({
      ...data,
      regionId: consultant.region_id,
    });
  }

  async assignRegion(jobId: string, regionId: string, assignedBy: string) {
    const consultant = await prisma.consultant.findFirst({
      where: { region_id: regionId, status: 'ACTIVE' },
    });

    if (!consultant) {
      throw new HttpException(404, 'No active consultant found in this region');
    }

    return this.jobAllocationRepository.assignToConsultant({
      jobId,
      consultantId: consultant.id,
      assignedBy,
      regionId,
      source: AssignmentSource.MANUAL_HRM8,
    });
  }

  async unassign(jobId: string) {
    return this.jobAllocationRepository.unassign(jobId);
  }

  async getJobConsultants(jobId: string) {
    const assignments = await this.jobAllocationRepository.findConsultantsByJob(jobId);
    return assignments.map(a => ({
      id: a.consultant.id,
      firstName: a.consultant.first_name,
      lastName: a.consultant.last_name,
      email: a.consultant.email,
    }));
  }

  async getJobsForAllocation(filters: any) {
    const { limit = 10, offset = 0, search, regionId, assignmentStatus } = filters;
    const where: any = {
      status: { in: ['OPEN', 'ON_HOLD'] },
    };

    if (assignmentStatus && assignmentStatus !== 'ALL') {
      if (assignmentStatus === 'UNASSIGNED') {
        where.assigned_consultant_id = null;
      } else if (assignmentStatus === 'ASSIGNED') {
        where.assigned_consultant_id = { not: null };
      } else if (['OPEN', 'ON_HOLD', 'CLOSED', 'FILLED', 'DRAFT', 'CANCELLED', 'EXPIRED'].includes(assignmentStatus)) {
        where.status = assignmentStatus;
      }
    }

    if (regionId) {
      where.region_id = regionId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          assigned_consultant: {
            select: { id: true, first_name: true, last_name: true, email: true }
          },
          company: {
            select: { id: true, name: true, region_id: true }
          },
          region: {
            select: { name: true }
          }
        }
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs: jobs.map(this.mapToDTO), total };
  }

  private mapToDTO(job: any) {
    return {
      ...job,
      createdAt: job.created_at,
      postedAt: job.posted_at,
      assignedConsultant: job.assigned_consultant ? {
        id: job.assigned_consultant.id,
        firstName: job.assigned_consultant.first_name,
        lastName: job.assigned_consultant.last_name,
        email: job.assigned_consultant.email,
      } : null,
      assignedRegion: job.region ? job.region.name : 'Unassigned',
      company: job.company ? {
        id: job.company.id,
        name: job.company.name,
        regionId: job.company.region_id
      } : null,
    };
  }

  async getStats() {
    return this.jobAllocationRepository.getStats();
  }

  async getConsultantsForAssignment(filters: { regionId: string; search?: string }) {
    const { regionId, search } = filters;
    const where: any = {
      status: 'ACTIVE',
    };

    if (regionId && regionId !== 'all') {
      where.region_id = regionId;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const consultants = await prisma.consultant.findMany({
      where,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        current_jobs: true,
        max_jobs: true,
      },
    });

    return consultants.map(c => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      currentJobs: c.current_jobs,
      maxJobs: c.max_jobs
    }));
  }

  async autoAssignJob(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true }
    });
    if (!job) throw new HttpException(404, 'Job not found');

    const regionId = job.region_id || job.company?.region_id;
    if (!regionId) throw new HttpException(400, 'Job (and its Company) has no region assigned');

    const bestConsultant = await prisma.consultant.findFirst({
      where: { region_id: regionId, status: 'ACTIVE' },
      orderBy: { current_jobs: 'asc' },
    });

    if (!bestConsultant) throw new HttpException(404, 'No suitable consultant for auto-assignment');

    const result = await this.allocate({
      jobId,
      consultantId: bestConsultant.id,
      assignedBy: 'system',
      source: AssignmentSource.AUTO_RULES,
    });

    return result;
  }

  async getJobDetail(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: { id: true, name: true, region_id: true }
        },
        assigned_consultant: {
          select: { id: true, first_name: true, last_name: true, email: true }
        },
        region: {
          select: { name: true }
        }
      }
    });

    if (!job) throw new HttpException(404, 'Job not found');

    const jobDTO = {
      ...this.mapToDTO(job),
      hrm8Notes: '',
      hrm8Hidden: job.stealth,
      hrm8Status: job.status,
      description: job.description || '',
      location: job.location || '',
      status: job.status,
    };

    const analytics = {
      totalViews: job.views_count || 0,
      totalClicks: job.clicks_count || 0,
      totalApplications: 0,
      conversionRate: 0,
      viewsOverTime: [],
      sourceBreakdown: []
    };

    const activities: any[] = [];

    return { job: jobDTO, analytics, activities };
  }

  async getPipelineForJob(jobId: string, preferredConsultantId?: string | null): Promise<any> {
    const assignment = await prisma.consultantJobAssignment.findFirst({
      where: {
        job_id: jobId,
        status: 'ACTIVE',
        ...(preferredConsultantId ? { consultant_id: preferredConsultantId } : {}),
      },
      orderBy: { assigned_at: 'desc' },
    });

    if (!assignment) return null;

    return {
      consultantId: assignment.consultant_id,
      jobId: assignment.job_id,
      stage: assignment.pipeline_stage,
      progress: assignment.pipeline_progress,
      note: assignment.pipeline_note,
      updatedAt: assignment.pipeline_updated_at,
      updatedBy: assignment.pipeline_updated_by,
    };
  }

  async getPipelineForConsultantJob(consultantId: string, jobId: string) {
    return this.getPipelineForJob(jobId, consultantId);
  }

  async updatePipelineForConsultantJob(consultantId: string, jobId: string, data: any) {
    const assignment = await prisma.consultantJobAssignment.findFirst({
      where: { consultant_id: consultantId, job_id: jobId, status: 'ACTIVE' },
    });

    if (!assignment) throw new HttpException(404, 'Assignment not found');

    return prisma.consultantJobAssignment.update({
      where: { id: assignment.id },
      data: {
        pipeline_stage: data.stage as PipelineStage,
        pipeline_progress: data.progress ?? assignment.pipeline_progress,
        pipeline_note: data.note ?? assignment.pipeline_note,
        pipeline_updated_at: new Date(),
        pipeline_updated_by: data.updatedBy || consultantId,
      },
    });
  }
}
