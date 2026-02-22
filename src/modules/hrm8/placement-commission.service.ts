import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface PlacementCommissionResult {
  created: boolean;
  commissionId?: string;
  reason?: string;
}

export class PlacementCommissionService {
  private static readonly DEFAULT_COMMISSION_RATE = 0.20;

  private static isManagedServiceJob(job: {
    hiring_mode: string;
    management_type: string | null;
    service_package: string | null;
  }): boolean {
    const servicePackage = String(job.service_package || '').trim().toLowerCase();
    if (job.management_type === 'hrm8-managed') return true;
    if (job.hiring_mode === 'SELF_MANAGED') return false;
    return servicePackage !== 'self-managed';
  }

  static async createForHiredApplication(
    applicationId: string,
    db: DbClient = prisma
  ): Promise<PlacementCommissionResult> {
    const marker = `[HIRE_APPLICATION:${applicationId}]`;

    const application = await db.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        job_id: true,
        job: {
          select: {
            id: true,
            title: true,
            payment_status: true,
            payment_amount: true,
            payment_currency: true,
            hiring_mode: true,
            management_type: true,
            service_package: true,
            assigned_consultant_id: true,
          },
        },
      },
    });

    if (!application) {
      return { created: false, reason: 'Application not found' };
    }

    if (application.status !== 'HIRED') {
      return { created: false, reason: 'Application is not marked HIRED' };
    }

    if (!application.job) {
      return { created: false, reason: 'Application has no job' };
    }

    const job = application.job;
    if (!this.isManagedServiceJob(job)) {
      return { created: false, reason: 'Self-managed job does not generate consultant placement commission' };
    }

    if (job.payment_status !== 'PAID') {
      return { created: false, reason: 'Managed service payment is not completed' };
    }

    if (!job.payment_amount || job.payment_amount <= 0) {
      return { created: false, reason: 'Managed service payment amount is missing' };
    }

    let consultantId = job.assigned_consultant_id || null;
    if (!consultantId) {
      const assignment = await db.consultantJobAssignment.findFirst({
        where: {
          job_id: job.id,
          status: 'ACTIVE',
        },
        orderBy: { assigned_at: 'desc' },
        select: { consultant_id: true },
      });
      consultantId = assignment?.consultant_id || null;
    }

    if (!consultantId) {
      return { created: false, reason: 'No active consultant assigned to this job' };
    }

    const existingCommission = await db.commission.findFirst({
      where: {
        consultant_id: consultantId,
        job_id: job.id,
        type: 'PLACEMENT',
        notes: { contains: marker },
      },
      select: { id: true },
    });

    if (existingCommission) {
      return {
        created: false,
        commissionId: existingCommission.id,
        reason: 'Placement commission already exists for this hired application',
      };
    }

    const consultant = await db.consultant.findUnique({
      where: { id: consultantId },
      select: { id: true, region_id: true, default_commission_rate: true },
    });

    if (!consultant) {
      return { created: false, reason: 'Assigned consultant not found' };
    }

    if (!consultant.region_id) {
      return { created: false, reason: 'Assigned consultant has no region configured' };
    }

    const commissionRate = consultant.default_commission_rate ?? this.DEFAULT_COMMISSION_RATE;
    const commissionAmount = Number((job.payment_amount * commissionRate).toFixed(2));
    if (commissionAmount <= 0) {
      return { created: false, reason: 'Calculated commission amount is zero' };
    }

    const commission = await db.commission.create({
      data: {
        consultant_id: consultant.id,
        region_id: consultant.region_id,
        job_id: job.id,
        type: 'PLACEMENT',
        amount: commissionAmount,
        rate: commissionRate,
        description: `Placement commission for hired candidate on job: ${job.title}`,
        status: 'PENDING',
        notes: marker,
      },
      select: { id: true },
    });

    return { created: true, commissionId: commission.id };
  }
}
