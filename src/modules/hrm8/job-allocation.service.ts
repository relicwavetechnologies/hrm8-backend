import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';

export class JobAllocationService extends BaseService {
  async getAssignmentInfo(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        region: true,
        company: true,
        consultant_assignments: {
          include: {
            consultant: true
          }
        }
      }
    });

    if (!job) throw new HttpException(404, 'Job not found');
    return job;
  }

  async assignConsultantToJob(jobId: string, consultantId: string, assignedBy?: string) {
    return prisma.consultantJobAssignment.upsert({
      where: {
        consultant_id_job_id: {
          consultant_id: consultantId,
          job_id: jobId
        }
      },
      create: {
        job_id: jobId,
        consultant_id: consultantId,
        assigned_by: assignedBy,
        status: 'ACTIVE'
      },
      update: {
        status: 'ACTIVE'
      }
    });
  }

  async unassignConsultantFromJob(jobId: string, consultantId: string) {
    return prisma.consultantJobAssignment.delete({
      where: {
        consultant_id_job_id: {
          consultant_id: consultantId,
          job_id: jobId
        }
      }
    });
  }

  async assignRegionToJob(jobId: string, regionId: string) {
    return prisma.job.update({
      where: { id: jobId },
      data: { region_id: regionId }
    });
  }

  async autoAssignJob(jobId: string): Promise<void> {
    // Basic logic: find consultant with least ACTIVE assignments in that region
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.region_id) return;

    const consultants = await prisma.consultant.findMany({
      where: {
        status: 'ACTIVE',
        // In real apps, check if consultant belongs to the region or has expertise
      },
      include: {
        _count: {
          select: { job_assignments: { where: { status: 'ACTIVE' } } }
        }
      },
      orderBy: {
        job_assignments: { _count: 'asc' }
      },
      take: 1
    });

    if (consultants.length > 0) {
      await this.assignConsultantToJob(jobId, consultants[0].id, 'SYSTEM');
    }
  }

  async getPipelineForJob(jobId: string, consultantId?: string | null): Promise<any> {
    if (consultantId) {
      return prisma.consultantJobAssignment.findUnique({
        where: { consultant_id_job_id: { consultant_id: consultantId, job_id: jobId } }
      });
    }
    return prisma.consultantJobAssignment.findMany({
      where: { job_id: jobId }
    });
  }

  async getPipelineForConsultantJob(consultantId: string, jobId: string) {
    return prisma.consultantJobAssignment.findUnique({
      where: { consultant_id_job_id: { consultant_id: consultantId, job_id: jobId } }
    });
  }

  async updatePipelineForConsultantJob(consultantId: string, jobId: string, data: any) {
    return prisma.consultantJobAssignment.update({
      where: { consultant_id_job_id: { consultant_id: consultantId, job_id: jobId } },
      data: {
        pipeline_stage: data.stage,
        pipeline_progress: data.progress,
        pipeline_note: data.notes,
        pipeline_updated_at: new Date()
      }
    });
  }
}

export const jobAllocationService = new JobAllocationService();
