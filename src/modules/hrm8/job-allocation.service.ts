import { BaseService } from '../../core/service';
import { JobAllocationRepository } from './job-allocation.repository';
import { HttpException } from '../../core/http-exception';
import { AssignmentSource, PipelineStage } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';

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
      where.OR = [
        { region_id: regionId },
        { company: { region_id: regionId } }
      ];
    }

    if (search) {
      const searchFilter = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
      where.AND = where.AND || [];
      where.AND.push({ OR: searchFilter });
    }

    if (filters.companyId) {
      const companyFilter = this.isUuid(filters.companyId)
        ? { company_id: filters.companyId }
        : { company: { name: { contains: filters.companyId, mode: 'insensitive' } } };
      where.AND = where.AND || [];
      where.AND.push(companyFilter);
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
            select: { id: true, name: true }
          }
        }
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs: jobs.map(this.mapToAllocationDTO), total };
  }

  private mapToAllocationDTO(job: any) {
    return {
      id: job.id,
      title: job.title,
      location: job.location,
      category: job.category,
      status: job.status,
      companyId: job.company?.id,
      companyName: job.company?.name,
      regionId: job.region_id || job.company?.region_id || job.region?.id,
      createdAt: job.created_at,
      postedAt: job.posted_at,
      assignmentMode: job.assignment_mode,
      assignmentSource: job.assignment_source,
      assignedConsultantId: job.assigned_consultant_id,
      assignedConsultantName: job.assigned_consultant
        ? `${job.assigned_consultant.first_name} ${job.assigned_consultant.last_name}`
        : undefined,
      assignedConsultant: job.assigned_consultant ? {
        id: job.assigned_consultant.id,
        firstName: job.assigned_consultant.first_name,
        lastName: job.assigned_consultant.last_name,
        email: job.assigned_consultant.email,
      } : null,
      assignedRegion: job.region ? job.region.name : 'Unassigned',
    };
  }

  private mapToDetailDTO(job: any) {
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

  async getConsultantsForAssignment(filters: { regionId: string; search?: string; role?: string; availability?: string; industry?: string; language?: string }) {
    const { regionId, search, role, availability, industry, language } = filters;
    const where: any = {
      status: 'ACTIVE',
    };

    if (regionId && regionId !== 'all') {
      where.region_id = regionId;
    }

    if (role) {
      where.role = role;
    }

    if (availability) {
      where.availability = availability;
    }

    if (industry) {
      where.industry_expertise = { has: industry };
    }

    if (language) {
      where.languages = { contains: language };
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
        role: true,
        status: true,
        availability: true,
        region_id: true,
        industry_expertise: true,
        languages: true,
        current_jobs: true,
        max_jobs: true,
      },
    });

    return consultants.map(c => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      role: c.role,
      status: c.status,
      availability: c.availability,
      regionId: c.region_id,
      industryExpertise: c.industry_expertise,
      languages: c.languages as any,
      currentJobs: c.current_jobs,
      maxJobs: c.max_jobs
    }));
  }

  async getAssignmentInfo(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        assigned_consultant_id: true,
        assignment_mode: true,
        assignment_source: true,
        region_id: true,
        company: { select: { region_id: true } }
      }
    });

    if (!job) throw new HttpException(404, 'Job not found');

    const consultants = await this.getJobConsultants(jobId);
    const pipeline = await this.getPipelineForJob(jobId);

    return {
      job: {
        id: job.id,
        title: job.title,
        assignedConsultantId: job.assigned_consultant_id || undefined,
        assignmentMode: job.assignment_mode || undefined,
        assignmentSource: job.assignment_source || undefined,
        regionId: job.region_id || job.company?.region_id || undefined
      },
      consultants,
      pipeline
    };
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

  async getJobDetail(jobId: string, allowedRegionIds?: string[]) {
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
    const effectiveRegionId = job.region_id || job.company?.region_id;
    if (allowedRegionIds && allowedRegionIds.length > 0 && (!effectiveRegionId || !allowedRegionIds.includes(effectiveRegionId))) {
      throw new HttpException(403, 'Access denied for job');
    }

    const hrm8Status = job.hrm8_status || job.status;
    const hrm8Hidden = job.hrm8_hidden ?? job.stealth;
    const jobDTO = {
      id: job.id,
      title: job.title,
      company: {
        id: job.company?.id,
        name: job.company?.name,
      },
      department: job.department,
      location: job.location,
      description: job.description || '',
      status: job.status,
      hrm8_hidden: hrm8Hidden,
      hrm8_status: hrm8Status,
      hrm8_notes: job.hrm8_notes || '',
      posted_at: job.posted_at,
      expires_at: job.expires_at,
    };

    const totalApplications = await prisma.application.count({ where: { job_id: job.id } });
    const totalViews = job.views_count || 0;
    const totalClicks = job.clicks_count || 0;
    const conversionRate = totalViews > 0 ? Math.round((totalApplications / totalViews) * 100) : 0;

    const analytics = {
      total_views: totalViews,
      total_clicks: totalClicks,
      total_applications: totalApplications,
      conversion_rate: conversionRate,
      views_over_time: [],
      source_breakdown: [],
    };

    const activities: any[] = [];

    return { job: jobDTO, analytics, activities };
  }

  async getJobBoardCompanies(params: {
    page?: number;
    limit?: number;
    search?: string;
    regionId?: string;
    allowedRegionIds?: string[];
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { domain: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.regionId && params.regionId !== 'all') {
      where.region_id = params.regionId;
    }

    if (params.allowedRegionIds && params.allowedRegionIds.length > 0) {
      where.region_id = { in: params.allowedRegionIds };
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          domain: true,
          jobs: {
            select: {
              status: true,
              hrm8_status: true,
              views_count: true,
              clicks_count: true,
            },
          },
        },
      }),
      prisma.company.count({ where }),
    ]);

    const mapped = companies.map(company => {
      const jobs = company.jobs || [];
      let totalViews = 0;
      let totalClicks = 0;
      let activeJobs = 0;
      let onHoldJobs = 0;
      for (const job of jobs) {
        const effectiveStatus = job.hrm8_status || job.status;
        if (effectiveStatus === 'OPEN') activeJobs += 1;
        if (effectiveStatus === 'ON_HOLD') onHoldJobs += 1;
        totalViews += job.views_count || 0;
        totalClicks += job.clicks_count || 0;
      }

      return {
        id: company.id,
        name: company.name,
        domain: company.domain,
        total_jobs: jobs.length,
        active_jobs: activeJobs,
        on_hold_jobs: onHoldJobs,
        total_views: totalViews,
        total_clicks: totalClicks,
      };
    });

    return {
      companies: mapped,
      total,
      page,
      page_size: limit,
    };
  }

  async updateJobVisibility(params: {
    jobId: string;
    hidden: boolean;
    performedBy: string;
    performedByEmail?: string;
    performedByRole?: string;
    allowedRegionIds?: string[];
    ipAddress?: string;
    userAgent?: string;
  }) {
    const job = await prisma.job.findUnique({
      where: { id: params.jobId },
      include: { company: { select: { region_id: true } } },
    });
    if (!job) throw new HttpException(404, 'Job not found');
    const effectiveRegionId = job.region_id || job.company?.region_id;
    if (params.allowedRegionIds && params.allowedRegionIds.length > 0 && (!effectiveRegionId || !params.allowedRegionIds.includes(effectiveRegionId))) {
      throw new HttpException(403, 'Access denied for job');
    }

    const updated = await prisma.job.update({
      where: { id: params.jobId },
      data: { hrm8_hidden: params.hidden },
    });

    const auditLogService = new AuditLogService(new AuditLogRepository());
    await auditLogService.log({
      entityType: 'job',
      entityId: params.jobId,
      action: 'UPDATE',
      performedBy: params.performedBy,
      performedByEmail: params.performedByEmail || 'unknown',
      performedByRole: params.performedByRole || 'SYSTEM',
      changes: { hrm8_hidden: params.hidden },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: `Updated HRM8 job visibility to ${params.hidden ? 'hidden' : 'visible'}`,
    });

    return updated;
  }

  async updateJobStatus(params: {
    jobId: string;
    status: string;
    notes?: string;
    performedBy: string;
    performedByEmail?: string;
    performedByRole?: string;
    allowedRegionIds?: string[];
    ipAddress?: string;
    userAgent?: string;
  }) {
    const job = await prisma.job.findUnique({
      where: { id: params.jobId },
      include: { company: { select: { region_id: true } } },
    });
    if (!job) throw new HttpException(404, 'Job not found');
    const effectiveRegionId = job.region_id || job.company?.region_id;
    if (params.allowedRegionIds && params.allowedRegionIds.length > 0 && (!effectiveRegionId || !params.allowedRegionIds.includes(effectiveRegionId))) {
      throw new HttpException(403, 'Access denied for job');
    }

    const updated = await prisma.job.update({
      where: { id: params.jobId },
      data: {
        hrm8_status: params.status as any,
        hrm8_notes: params.notes || null,
      },
    });

    const auditLogService = new AuditLogService(new AuditLogRepository());
    await auditLogService.log({
      entityType: 'job',
      entityId: params.jobId,
      action: 'UPDATE',
      performedBy: params.performedBy,
      performedByEmail: params.performedByEmail || 'unknown',
      performedByRole: params.performedByRole || 'SYSTEM',
      changes: { hrm8_status: params.status, hrm8_notes: params.notes || null },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: `Updated HRM8 job status to ${params.status}`,
    });

    return updated;
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
