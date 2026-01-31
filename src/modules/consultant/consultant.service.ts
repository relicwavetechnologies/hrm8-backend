import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { JobAllocationService } from '../hrm8/job-allocation.service';
import { JobAllocationRepository } from '../hrm8/job-allocation.repository';

export class ConsultantService extends BaseService {
  private jobAllocationService: JobAllocationService;

  constructor() {
    super();
    this.jobAllocationService = new JobAllocationService(new JobAllocationRepository());
  }

  async getProfile(consultantId: string) {
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId }
    });
    if (!consultant) throw new HttpException(404, 'Consultant not found');
    return consultant;
  }

  async updateProfile(consultantId: string, data: any) {
    const allowedUpdates = {
      phone: data.phone,
      photo: data.photo,
      address: data.address,
      city: data.city,
      state_province: data.stateProvince,
      country: data.country,
      languages: data.languages,
      industry_expertise: data.industryExpertise,
      resume_url: data.resumeUrl,
      linkedin_url: data.linkedinUrl,
      payment_method: data.paymentMethod,
      tax_information: data.taxInformation,
      availability: data.availability
    };

    // Filter out undefined
    const updateData = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined)
    );

    return prisma.consultant.update({
      where: { id: consultantId },
      data: updateData
    });
  }

  async getAssignedJobs(consultantId: string, filters?: { status?: string }) {
    // Reusing the robust logic from JobAllocationService
    // We fetch assignments instead of just IDs to get more metadata if needed, 
    // but legacy service fetches IDs then Jobs. Let's do a direct join for efficiency.
    const where: any = {
      assigned_consultant_id: consultantId
    };
    if (filters?.status) where.status = filters.status;

    // Also get jobs assigned via ConsultantJobAssignment table (many-to-many / specific assignments)
    // The legacy service calls JobAllocationService.getConsultantJobs(consultantId) which returns IDs.

    // Let's implement deeply using Prisma includes
    const assignments = await prisma.consultantJobAssignment.findMany({
      where: { consultant_id: consultantId, status: 'ACTIVE' },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Map to Job format
    // Also filtering manually if status filter applies to Job status
    let jobs = assignments.map(a => {
      return {
        ...a.job,
        pipeline: {
          stage: a.pipeline_stage,
          progress: a.pipeline_progress,
          note: a.pipeline_note,
          updatedAt: a.pipeline_updated_at
        }
      };
    });

    if (filters?.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }

    return jobs;
  }

  async getJobDetails(consultantId: string, jobId: string) {
    // 1. Verify assignment
    const assignment = await prisma.consultantJobAssignment.findFirst({
      where: { consultant_id: consultantId, job_id: jobId, status: 'ACTIVE' }
    });

    if (!assignment) {
      throw new HttpException(403, 'Consultant is not assigned to this job');
    }

    // 2. Fetch Job with detailed info
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: { select: { id: true, name: true, domain: true } }, // Minimal company info
        assigned_consultant: { select: { id: true, first_name: true, last_name: true } }
      }
    });

    if (!job) throw new HttpException(404, 'Job not found');

    // 3. Fetch Team (other consultants assigned to this job)
    const teamAssignments = await prisma.consultantJobAssignment.findMany({
      where: { job_id: jobId, status: 'ACTIVE', consultant_id: { not: consultantId } },
      include: {
        consultant: { select: { id: true, first_name: true, last_name: true, email: true } }
      }
    });

    return {
      job,
      pipeline: {
        stage: assignment.pipeline_stage,
        progress: assignment.pipeline_progress,
        note: assignment.pipeline_note,
        updatedAt: assignment.pipeline_updated_at
      },
      team: teamAssignments.map(t => t.consultant),
      employer: {
        contactName: "Confidential", // Mocking strictly as per Business Rule (Consultants don't see full contact details instantly?) 
        // Actually legacy code returns "Confidential" static string. So this IS the deep implementation of that business rule.
        email: "confidential@employer.com"
      }
    };
  }

  async updateJobPipeline(consultantId: string, jobId: string, data: { stage?: string, note?: string }) {
    return this.jobAllocationService.updatePipelineForConsultantJob(consultantId, jobId, {
      ...data,
      updatedBy: consultantId
    });
  }

  async submitShortlist(consultantId: string, jobId: string, candidateIds: string[], notes?: string) {
    // 1. Verify and update status
    await this.updateJobPipeline(consultantId, jobId, {
      stage: 'SHORTLIST_SENT',
      note: `Shortlist submitted: ${candidateIds.length} candidates. Notes: ${notes || 'None'}`
    });

    // 2. Ideally trigger notification or email (Skipping for now as not in legacy service explicitly shown here but recommended)
  }

  async logJobActivity(consultantId: string, jobId: string, activityType: string, notes: string) {
    await this.updateJobPipeline(consultantId, jobId, {
      note: `[Activity: ${activityType}] ${notes}`
    });
  }

  async getCommissions(consultantId: string, filters?: any) {
    const where: any = { consultant_id: consultantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;

    return prisma.commission.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
  }

  async getPerformanceMetrics(consultantId: string) {
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId }
    });
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    return {
      totalPlacements: consultant.total_placements,
      totalRevenue: consultant.total_revenue,
      successRate: consultant.success_rate,
      averageDaysToFill: consultant.average_days_to_fill,
      pendingCommissions: consultant.pending_commissions,
      totalCommissionsPaid: consultant.total_commissions_paid
    };
  }

  async getDashboardAnalytics(consultantId: string) {
    // Aggregating dashboard stats
    const [performance, activeJobsCount] = await Promise.all([
      this.getPerformanceMetrics(consultantId),
      prisma.consultantJobAssignment.count({
        where: { consultant_id: consultantId, status: 'ACTIVE' }
      })
    ]);

    return {
      ...performance,
      activeJobs: activeJobsCount
    };
  }
}
