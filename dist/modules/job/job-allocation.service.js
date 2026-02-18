"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobAllocationService = exports.JobAllocationService = void 0;
const prisma_1 = require("../../utils/prisma");
const service_1 = require("../../core/service");
const client_1 = require("@prisma/client");
class JobAllocationService extends service_1.BaseService {
    /**
     * Auto-assign job to best matching consultant
     */
    async autoAssignJob(jobId) {
        try {
            const job = await prisma_1.prisma.job.findUnique({
                where: { id: jobId },
                select: {
                    id: true,
                    company_id: true,
                    title: true,
                    region_id: true,
                    assigned_consultant_id: true,
                    company: {
                        select: { region_id: true }
                    }
                }
            });
            if (!job) {
                return { success: false, error: 'Job not found' };
            }
            // Idempotency: if already assigned to an active consultant, reuse assignment.
            if (job.assigned_consultant_id) {
                const existingConsultant = await prisma_1.prisma.consultant.findUnique({
                    where: { id: job.assigned_consultant_id },
                    select: { id: true, status: true }
                });
                if (existingConsultant?.status === 'ACTIVE') {
                    return { success: true, consultantId: existingConsultant.id };
                }
            }
            // Resolve region from job first, then company fallback.
            const resolvedRegionId = job.region_id || job.company?.region_id || null;
            // Prefer same-region consultant.
            let consultant = resolvedRegionId
                ? await prisma_1.prisma.consultant.findFirst({
                    where: {
                        region_id: resolvedRegionId,
                        status: 'ACTIVE'
                    },
                    orderBy: {
                        current_jobs: 'asc'
                    }
                })
                : null;
            // Fallback: if region mapping is incomplete, pick least-loaded active consultant.
            if (!consultant) {
                consultant = await prisma_1.prisma.consultant.findFirst({
                    where: { status: 'ACTIVE' },
                    orderBy: { current_jobs: 'asc' }
                });
            }
            if (!consultant) {
                return { success: false, error: 'No active consultant found for auto-assignment' };
            }
            // Assign job
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        assigned_consultant_id: consultant.id,
                        assignment_source: client_1.AssignmentSource.AUTO_RULES,
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
                            assignment_source: client_1.AssignmentSource.AUTO_RULES,
                            assigned_by: 'system'
                        }
                    });
                }
                else {
                    await tx.consultantJobAssignment.update({
                        where: { id: existingAssignment.id },
                        data: {
                            status: 'ACTIVE',
                            assignment_source: client_1.AssignmentSource.AUTO_RULES,
                            assigned_by: 'system'
                        }
                    });
                }
            });
            return { success: true, consultantId: consultant.id };
        }
        catch (error) {
            console.error('Auto-assign job error:', error);
            return { success: false, error: error.message || 'Failed to auto-assign job' };
        }
    }
}
exports.JobAllocationService = JobAllocationService;
exports.jobAllocationService = new JobAllocationService();
