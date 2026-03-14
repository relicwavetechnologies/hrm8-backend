import { prisma } from '../../utils/prisma';
import { BaseService } from '../../core/service';
import { AssignmentSource } from '@prisma/client';
import { ConversationService } from '../communication/conversation.service';

export class JobAllocationService extends BaseService {
    /**
     * Auto-assign job to best matching consultant
     */
    async autoAssignJob(jobId: string): Promise<{ success: boolean; consultantId?: string; error?: string }> {
        try {
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                select: {
                    id: true,
                    company_id: true,
                    title: true,
                    region_id: true,
                    assigned_consultant_id: true,
                    company: {
                        select: { region_id: true, default_consultant_id: true }
                    }
                }
            });

            if (!job) {
                return { success: false, error: 'Job not found' };
            }

            let consultant: { id: string; status: string; region_id: string | null } | null = null;

            // Prefer company default consultant (360 conversion) when available and ACTIVE.
            const defaultConsultantId = job.company?.default_consultant_id;
            if (defaultConsultantId) {
                const defaultConsultant = await prisma.consultant.findUnique({
                    where: { id: defaultConsultantId },
                    select: { id: true, status: true, region_id: true }
                });
                if (defaultConsultant?.status === 'ACTIVE') {
                    consultant = defaultConsultant;
                }
            }

            // Idempotency: if already assigned to an active consultant, reuse assignment.
            if (!consultant && job.assigned_consultant_id) {
                const existingConsultant = await prisma.consultant.findUnique({
                    where: { id: job.assigned_consultant_id },
                    select: { id: true, status: true }
                });
                if (existingConsultant?.status === 'ACTIVE') {
                    return { success: true, consultantId: existingConsultant.id };
                }
            }

            // Only auto-assign when company has default_consultant_id (360 conversion).
            // Sales/self-reg conversions have no default: regional admin must assign via ConsultantAssignmentRequest.
            if (!consultant) {
                const resolvedRegionId = job.region_id || job.company?.region_id || null;
                return {
                    success: false,
                    error: defaultConsultantId
                        ? `Company default consultant is inactive or not found`
                        : resolvedRegionId
                            ? `No default consultant. Regional admin must assign via consultant assignment requests.`
                            : 'Job and company have no region assigned — cannot auto-assign'
                };
            }

            // Assign job
            await prisma.$transaction(async (tx) => {
                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        assigned_consultant_id: consultant.id,
                        assignment_source: AssignmentSource.AUTO_RULES,
                        ...(job.region_id ? {} : consultant.region_id ? { region_id: consultant.region_id } : {}),
                    }
                });

                // If reassigning from a stale/inactive consultant, mark old assignment inactive
                // and decrement old consultant load defensively.
                if (job.assigned_consultant_id && job.assigned_consultant_id !== consultant.id) {
                    await tx.consultantJobAssignment.updateMany({
                        where: {
                            job_id: jobId,
                            consultant_id: job.assigned_consultant_id,
                            status: 'ACTIVE'
                        },
                        data: { status: 'INACTIVE' }
                    });

                    await tx.consultant.updateMany({
                        where: {
                            id: job.assigned_consultant_id,
                            current_jobs: { gt: 0 }
                        },
                        data: {
                            current_jobs: { decrement: 1 }
                        }
                    });
                }

                // Prevent duplicate load increments on retry.
                const existingAssignment = await tx.consultantJobAssignment.findFirst({
                    where: {
                        consultant_id: consultant.id,
                        job_id: jobId
                    }
                });

                if (!existingAssignment) {
                    await tx.consultant.update({
                        where: { id: consultant.id },
                        data: {
                            current_jobs: { increment: 1 }
                        }
                    });

                    await tx.consultantJobAssignment.create({
                        data: {
                            consultant_id: consultant.id,
                            job_id: jobId,
                            status: 'ACTIVE',
                            assignment_source: AssignmentSource.AUTO_RULES,
                            assigned_by: 'system'
                        }
                    });
                } else {
                    await tx.consultantJobAssignment.update({
                        where: { id: existingAssignment.id },
                        data: {
                            status: 'ACTIVE',
                            assignment_source: AssignmentSource.AUTO_RULES,
                            assigned_by: 'system'
                        }
                    });
                }
            });

            try {
                await new ConversationService().findOrCreateCompanyConsultantConversation(jobId);
            } catch (convErr) {
                console.error('[JobAllocation] Failed to create company-consultant conversation:', convErr);
            }

            return { success: true, consultantId: consultant.id };
        } catch (error: any) {
            console.error('Auto-assign job error:', error);
            return { success: false, error: error.message || 'Failed to auto-assign job' };
        }
    }
}

export const jobAllocationService = new JobAllocationService();
