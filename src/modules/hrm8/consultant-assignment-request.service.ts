import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { ConsultantAssignmentRequestStatus, HRM8UserRole } from '@prisma/client';
import { jobAllocationService } from './job-allocation.service';
import { AssignmentSource } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { notifyHrm8User, notifyCompanyUser } from '../notification/notification-service-singleton';

export class ConsultantAssignmentRequestService extends BaseService {
  private readonly logger = Logger.create('consultant-assignment-request-service');

  async create(companyId: string, jobId: string, regionId?: string | null) {
    const existing = await prisma.consultantAssignmentRequest.findFirst({
      where: { job_id: jobId, status: 'PENDING' },
    });
    if (existing) {
      return existing;
    }

    const request = await prisma.consultantAssignmentRequest.create({
      data: {
        company_id: companyId,
        job_id: jobId,
        region_id: regionId || null,
        status: ConsultantAssignmentRequestStatus.PENDING,
      },
    });

    this.logger.info('Consultant assignment request created', {
      requestId: request.id,
      companyId,
      jobId,
      regionId,
    });

    await this.notifyRegionalAdminsOfNewRequest(request.id, companyId, jobId, regionId);

    return request;
  }

  private async notifyRegionalAdminsOfNewRequest(
    requestId: string,
    companyId: string,
    jobId: string,
    regionId?: string | null
  ) {
    try {
      const [company, job] = await Promise.all([
        prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
        prisma.job.findUnique({ where: { id: jobId }, select: { title: true } }),
      ]);
      const companyName = company?.name || 'Unknown company';
      const jobTitle = job?.title || 'Unknown job';

      const adminBaseUrl =
        process.env.HRM8_ADMIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
      const actionUrl = `${adminBaseUrl}/consultant-assignment-requests`;

      const title = 'Consultant assignment needed';
      const message = `${companyName} chose HRM8 managed service for "${jobTitle}" but no consultant is available in the region. Please assign a consultant.`;

      const hrm8Users = await this.getHrm8UsersForConsultantAssignment(regionId);
      for (const admin of hrm8Users) {
        await notifyHrm8User(admin.id, {
          title,
          message,
          type: 'CONSULTANT_ASSIGNMENT_NEEDED',
          actionUrl,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to notify regional admins of consultant assignment request', {
        requestId,
        error: (err as Error).message,
      });
    }
  }

  private async getHrm8UsersForConsultantAssignment(regionId?: string | null): Promise<{ id: string }[]> {
    const orConditions: any[] = [{ role: HRM8UserRole.GLOBAL_ADMIN }];

    if (regionId) {
      const region = await prisma.region.findUnique({
        where: { id: regionId },
        select: { licensee_id: true },
      });
      if (region?.licensee_id) {
        orConditions.push({
          role: HRM8UserRole.REGIONAL_LICENSEE,
          licensee_id: region.licensee_id,
        });
      }
    } else {
      orConditions.push({ role: HRM8UserRole.REGIONAL_LICENSEE });
    }

    const users = await prisma.hRM8User.findMany({
      where: {
        status: 'ACTIVE',
        OR: orConditions,
      },
      select: { id: true },
    });
    return users;
  }

  async listPending(filters?: { regionIds?: string[]; licenseeId?: string }) {
    const where: any = { status: ConsultantAssignmentRequestStatus.PENDING };

    let regionIds = filters?.regionIds;
    if (!regionIds?.length && filters?.licenseeId) {
      const regions = await prisma.region.findMany({
        where: { licensee_id: filters.licenseeId },
        select: { id: true },
      });
      regionIds = regions.map((r) => r.id);
    }

    if (regionIds && regionIds.length > 0) {
      where.OR = [
        { region_id: { in: regionIds } },
        { region_id: null },
      ];
    }

    const requests = await prisma.consultantAssignmentRequest.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, region_id: true } },
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            service_package: true,
            hiring_mode: true,
          },
        },
        region: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    return requests;
  }

  async assign(
    requestId: string,
    consultantId: string,
    assignedBy: string,
    options?: { skipRegionCheck?: boolean }
  ) {
    const request = await prisma.consultantAssignmentRequest.findUnique({
      where: { id: requestId },
      include: {
        company: true,
        job: true,
      },
    });

    if (!request) throw new HttpException(404, 'Consultant assignment request not found');
    if (request.status !== ConsultantAssignmentRequestStatus.PENDING) {
      throw new HttpException(400, `Request is already ${request.status}`);
    }

    await jobAllocationService.allocate({
      jobId: request.job_id,
      consultantId,
      assignedBy,
      assignedByName: 'Regional admin',
      source: AssignmentSource.MANUAL_HRM8,
      reason: 'Assigned by regional admin from pending requests',
      skipRegionCheck: options?.skipRegionCheck ?? true,
    });

    await prisma.consultantAssignmentRequest.update({
      where: { id: requestId },
      data: {
        status: ConsultantAssignmentRequestStatus.ASSIGNED,
        consultant_id: consultantId,
        assigned_by: assignedBy,
        assigned_at: new Date(),
      },
    });

    await prisma.company.update({
      where: { id: request.company_id },
      data: { default_consultant_id: consultantId },
    });

    this.logger.info('Consultant assigned to request', {
      requestId,
      jobId: request.job_id,
      companyId: request.company_id,
      consultantId,
    });

    await this.notifyCompanyOfAssignment(request.job_id, request.company_id, consultantId);

    return { success: true, jobId: request.job_id, consultantId };
  }

  private async notifyCompanyOfAssignment(
    jobId: string,
    companyId: string,
    consultantId: string
  ) {
    try {
      const [job, consultant] = await Promise.all([
        prisma.job.findUnique({
          where: { id: jobId },
          select: { title: true, created_by: true },
        }),
        prisma.consultant.findUnique({
          where: { id: consultantId },
          select: { first_name: true, last_name: true },
        }),
      ]);

      const consultantName = consultant
        ? `${consultant.first_name} ${consultant.last_name}`.trim()
        : 'A consultant';
      const jobTitle = job?.title || 'your job';

      const atsBase = process.env.ATS_FRONTEND_URL || 'http://localhost:8080';
      const actionUrl = `${atsBase}/jobs/${jobId}/setup`;

      const title = 'Consultant assigned';
      const message = `${consultantName} has been assigned to manage "${jobTitle}". You can now continue with the hiring process.`;

      const userIds = await this.getCompanyUserIdsForJob(companyId, job?.created_by);
      for (const userId of userIds) {
        await notifyCompanyUser(userId, {
          title,
          message,
          type: 'CONSULTANT_ASSIGNED',
          actionUrl,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to notify company of consultant assignment', {
        jobId,
        companyId,
        error: (err as Error).message,
      });
    }
  }

  private async getCompanyUserIdsForJob(
    companyId: string,
    createdBy?: string | null
  ): Promise<string[]> {
    if (createdBy) {
      const creator = await prisma.user.findUnique({
        where: { id: createdBy, company_id: companyId },
        select: { id: true },
      });
      if (creator) return [creator.id];
    }
    const users = await prisma.user.findMany({
      where: { company_id: companyId },
      select: { id: true },
      take: 5,
    });
    return users.map((u) => u.id);
  }
}
