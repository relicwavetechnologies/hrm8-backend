import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import type { ConsultantDecisionAction, ConsultantDecisionRequestStatus } from '@prisma/client';
import { ApplicationService } from '../application/application.service';
import { ApplicationRepository } from '../application/application.repository';
import { CandidateRepository } from '../candidate/candidate.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { ApplicationActivityService } from '../application/application-activity.service';
import { ActorType, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';

export interface CreateDecisionRequestInput {
  applicationId: string;
  jobId: string;
  consultantId: string;
  action: ConsultantDecisionAction;
  targetRoundId: string | null;
  reason?: string;
}

export interface MoveToRoundResult {
  moved: true;
}

export interface RequiresApprovalResult {
  moved: false;
  requiresApproval: true;
  requestId: string;
  message: string;
}

export type MoveToRoundOrApprovalResult = MoveToRoundResult | RequiresApprovalResult;

export class ConsultantDecisionRequestService {
  /**
   * Create or return existing pending request for consultant offer/reject on HRM8-managed job.
   */
  static async createOrGetPending(
    input: CreateDecisionRequestInput
  ): Promise<{ id: string; status: 'PENDING'; existing: boolean }> {
    const existing = await prisma.consultantDecisionRequest.findUnique({
      where: {
        application_id_action: {
          application_id: input.applicationId,
          action: input.action,
        },
      },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        return { id: existing.id, status: 'PENDING', existing: true };
      }
      throw new HttpException(400, `A request for ${input.action} was already ${existing.status}. Cannot create duplicate.`);
    }

    const created = await prisma.consultantDecisionRequest.create({
      data: {
        application_id: input.applicationId,
        job_id: input.jobId,
        consultant_id: input.consultantId,
        action: input.action,
        target_round_id: input.targetRoundId,
        reason: input.reason ?? null,
        status: 'PENDING',
      },
      include: {
        application: {
          include: {
            candidate: { select: { first_name: true, last_name: true } },
          },
        },
        job: { select: { id: true, title: true, company_id: true } },
        consultant: { select: { first_name: true, last_name: true } },
      },
    });

    await this.notifyHrRequestCreated(created);

    await ApplicationActivityService.logSafe({
      applicationId: input.applicationId,
      actorId: input.consultantId,
      actorType: ActorType.CONSULTANT,
      action: 'other',
      subject: 'Consultant decision approval requested',
      description: `Consultant requested HR approval to move candidate to ${input.action}`,
      metadata: {
        requestId: created.id,
        action: input.action,
        source: 'consultant_decision_request',
      },
    });

    return { id: created.id, status: 'PENDING', existing: false };
  }

  /**
   * List decision requests for a job (HR view).
   */
  static async listByJob(jobId: string, status?: ConsultantDecisionRequestStatus) {
    const where: { job_id: string; status?: ConsultantDecisionRequestStatus } = { job_id: jobId };
    if (status) where.status = status;

    return prisma.consultantDecisionRequest.findMany({
      where,
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
          },
        },
        consultant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { requested_at: 'desc' },
    });
  }

  /**
   * List decision requests for a company's jobs (HR view).
   */
  static async listByCompany(companyId: string, status?: ConsultantDecisionRequestStatus) {
    const where: { job: { company_id: string }; status?: ConsultantDecisionRequestStatus } = {
      job: { company_id: companyId },
    };
    if (status) where.status = status;

    return prisma.consultantDecisionRequest.findMany({
      where,
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
          },
        },
        job: { select: { id: true, title: true, company_id: true } },
        consultant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { requested_at: 'desc' },
    });
  }

  /**
   * List consultant's own decision requests.
   */
  static async listByConsultant(consultantId: string, status?: ConsultantDecisionRequestStatus) {
    const where: { consultant_id: string; status?: ConsultantDecisionRequestStatus } = {
      consultant_id: consultantId,
    };
    if (status) where.status = status;

    return prisma.consultantDecisionRequest.findMany({
      where,
      include: {
        application: {
          include: {
            candidate: { select: { first_name: true, last_name: true } },
            job: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { requested_at: 'desc' },
    });
  }

  private static getNotificationService() {
    return new NotificationService(new NotificationRepository());
  }

  private static async getHrUserIdsForJob(jobId: string, companyId: string): Promise<string[]> {
    const hiringTeam = await prisma.jobHiringTeamMember.findMany({
      where: { job_id: jobId, user_id: { not: null } },
      select: { user_id: true },
    });
    const fromHiringTeam = hiringTeam.map((m) => m.user_id!).filter(Boolean);
    if (fromHiringTeam.length > 0) return [...new Set(fromHiringTeam)];

    const companyUsers = await prisma.user.findMany({
      where: { company_id: companyId },
      select: { id: true },
    });
    return companyUsers.map((u) => u.id);
  }

  private static async notifyHrRequestCreated(request: {
    id: string;
    action: ConsultantDecisionAction;
    application: { candidate?: { first_name: string | null; last_name: string | null } | null };
    job: { id: string; title: string; company_id: string };
    consultant: { first_name: string; last_name: string } | null;
  }) {
    try {
      const c = request.application?.candidate;
      const candidateName = c
        ? (`${c.first_name || ''} ${c.last_name || ''}`.trim() || 'a candidate')
        : 'a candidate';
      const consultantName = request.consultant
        ? `${request.consultant.first_name} ${request.consultant.last_name}`.trim()
        : 'A consultant';
      const actionLabel = request.action === 'OFFER' ? 'Offer' : 'Reject';
      const title = `Approval needed: ${actionLabel} request for ${candidateName}`;
      const message = `${consultantName} has requested HR approval to move ${candidateName} to ${actionLabel}. Please review in the job pipeline.`;
      const actionUrl = `/jobs/${request.job.id}`;

      const userIds = await this.getHrUserIdsForJob(request.job.id, request.job.company_id);
      const notificationService = this.getNotificationService();
      for (const userId of userIds) {
        await notificationService.createNotification({
          recipientType: NotificationRecipientType.USER,
          recipientId: userId,
          type: UniversalNotificationType.APPLICATION_STATUS_CHANGED,
          title,
          message,
          data: { requestId: request.id, jobId: request.job.id, action: request.action },
          actionUrl,
        });
      }
    } catch (err) {
      console.error('[ConsultantDecisionRequestService] notifyHrRequestCreated error:', err);
    }
  }

  private static async notifyConsultantApproved(
    consultantId: string,
    request: { action: ConsultantDecisionAction; application: { candidate?: { first_name: string | null; last_name: string | null } | null } }
  ) {
    try {
      const c = request.application?.candidate;
      const candidateName = c
        ? (`${c.first_name || ''} ${c.last_name || ''}`.trim() || 'the candidate')
        : 'the candidate';
      const actionLabel = request.action === 'OFFER' ? 'Offer' : 'Reject';
      const notificationService = this.getNotificationService();
      await notificationService.createNotification({
        recipientType: NotificationRecipientType.CONSULTANT,
        recipientId: consultantId,
        type: UniversalNotificationType.APPLICATION_STATUS_CHANGED,
        title: `Request approved: ${actionLabel} for ${candidateName}`,
        message: `HR approved your request to move ${candidateName} to ${actionLabel}. The move has been executed.`,
        data: { action: request.action },
      });
    } catch (err) {
      console.error('[ConsultantDecisionRequestService] notifyConsultantApproved error:', err);
    }
  }

  private static async notifyConsultantRejected(
    consultantId: string,
    request: {
      action: ConsultantDecisionAction;
      rejection_reason: string | null;
      application: { candidate?: { first_name: string | null; last_name: string | null } | null };
    }
  ) {
    try {
      const c = request.application?.candidate;
      const candidateName = c
        ? (`${c.first_name || ''} ${c.last_name || ''}`.trim() || 'the candidate')
        : 'the candidate';
      const actionLabel = request.action === 'OFFER' ? 'Offer' : 'Reject';
      const reasonText = request.rejection_reason ? ` Reason: ${request.rejection_reason}` : '';
      const notificationService = this.getNotificationService();
      await notificationService.createNotification({
        recipientType: NotificationRecipientType.CONSULTANT,
        recipientId: consultantId,
        type: UniversalNotificationType.APPLICATION_STATUS_CHANGED,
        title: `Request rejected: ${actionLabel} for ${candidateName}`,
        message: `HR rejected your request to move ${candidateName} to ${actionLabel}.${reasonText}`,
        data: { action: request.action, rejectionReason: request.rejection_reason },
      });
    } catch (err) {
      console.error('[ConsultantDecisionRequestService] notifyConsultantRejected error:', err);
    }
  }

  /**
   * Approve a request and execute the move.
   */
  static async approve(requestId: string, reviewerUserId: string) {
    const request = await prisma.consultantDecisionRequest.findUnique({
      where: { id: requestId },
      include: {
        application: { include: { candidate: { select: { first_name: true, last_name: true } } } },
        job: true,
      },
    });

    if (!request) throw new HttpException(404, 'Decision request not found');
    if (request.status !== 'PENDING') {
      throw new HttpException(400, `Request is already ${request.status}`);
    }

    let targetRoundId = request.target_round_id;
    if (!targetRoundId && request.action === 'REJECT') {
      const rejectedRound = await prisma.jobRound.findFirst({
        where: { job_id: request.job_id, is_fixed: true, fixed_key: 'REJECTED' },
      });
      if (!rejectedRound) throw new HttpException(400, 'Rejected round not found for this job');
      targetRoundId = rejectedRound.id;
    }
    if (!targetRoundId) throw new HttpException(400, 'Target round is required');

    const appRepo = new ApplicationRepository();
    const candidateRepo = new CandidateRepository();
    const notificationService = new NotificationService(new NotificationRepository());
    const appService = new ApplicationService(appRepo, candidateRepo, notificationService);

    await appService.moveToRound(request.application_id, targetRoundId, reviewerUserId);

    await prisma.consultantDecisionRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewed_by: reviewerUserId,
        reviewed_at: new Date(),
      },
    });

    await this.notifyConsultantApproved(request.consultant_id, {
      action: request.action,
      application: request.application,
    });

    await ApplicationActivityService.logSafe({
      applicationId: request.application_id,
      actorId: reviewerUserId,
      actorType: ActorType.HRM8_USER,
      action: 'other',
      subject: 'Consultant decision request approved',
      description: `HR approved consultant request to move candidate to ${request.action}`,
      metadata: {
        requestId,
        action: request.action,
        source: 'consultant_decision_request',
      },
    });

    return { approved: true, requestId };
  }

  /**
   * Reject a request.
   */
  static async reject(requestId: string, reviewerUserId: string, rejectionReason: string) {
    const request = await prisma.consultantDecisionRequest.findUnique({
      where: { id: requestId },
      include: {
        application: { include: { candidate: { select: { first_name: true, last_name: true } } } },
      },
    });

    if (!request) throw new HttpException(404, 'Decision request not found');
    if (request.status !== 'PENDING') {
      throw new HttpException(400, `Request is already ${request.status}`);
    }
    if (!rejectionReason?.trim()) {
      throw new HttpException(400, 'Rejection reason is required');
    }

    await prisma.consultantDecisionRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewed_by: reviewerUserId,
        reviewed_at: new Date(),
        rejection_reason: rejectionReason.trim(),
      },
    });

    await this.notifyConsultantRejected(request.consultant_id, {
      action: request.action,
      rejection_reason: rejectionReason.trim(),
      application: request.application,
    });

    await ApplicationActivityService.logSafe({
      applicationId: request.application_id,
      actorId: reviewerUserId,
      actorType: ActorType.HRM8_USER,
      action: 'other',
      subject: 'Consultant decision request rejected',
      description: `HR rejected consultant request to move candidate to ${request.action}`,
      metadata: {
        requestId,
        action: request.action,
        rejectionReason: rejectionReason.trim(),
        source: 'consultant_decision_request',
      },
    });

    return { rejected: true, requestId };
  }

  /**
   * Verify HR has access to the job (company user).
   */
  static async verifyHrAccess(requestId: string, companyId: string): Promise<boolean> {
    const request = await prisma.consultantDecisionRequest.findUnique({
      where: { id: requestId },
      include: { job: { select: { company_id: true } } },
    });
    if (!request) return false;
    return request.job.company_id === companyId;
  }

  /**
   * Get request by ID.
   */
  static async getById(requestId: string) {
    return prisma.consultantDecisionRequest.findUnique({
      where: { id: requestId },
      include: {
        application: {
          include: {
            candidate: { select: { first_name: true, last_name: true, email: true } },
          },
        },
        job: { select: { id: true, title: true, company_id: true } },
        consultant: { select: { first_name: true, last_name: true } },
      },
    });
  }
}
