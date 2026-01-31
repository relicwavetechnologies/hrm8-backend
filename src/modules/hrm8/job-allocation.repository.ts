import { prisma } from '../../utils/prisma';
import { Prisma, AssignmentSource, PipelineStage } from '@prisma/client';

export class JobAllocationRepository {
    async assignToConsultant(data: {
        jobId: string;
        consultantId: string;
        assignedBy: string;
        source?: AssignmentSource;
        regionId: string;
    }) {
        return prisma.$transaction(async (tx) => {
            // 1. Deactivate existing assignments for this job
            await tx.consultantJobAssignment.updateMany({
                where: { job_id: data.jobId, status: 'ACTIVE' },
                data: { status: 'INACTIVE', pipeline_stage: 'CLOSED' },
            });

            // 2. Update Job
            await tx.job.update({
                where: { id: data.jobId },
                data: {
                    region_id: data.regionId,
                    assigned_consultant_id: data.consultantId,
                    assignment_source: data.source || AssignmentSource.MANUAL_HRM8,
                    assignment_mode: 'MANUAL',
                },
            });

            // 3. Create new assignment
            const assignment = await tx.consultantJobAssignment.create({
                data: {
                    job_id: data.jobId,
                    consultant_id: data.consultantId,
                    assigned_by: data.assignedBy,
                    status: 'ACTIVE',
                    assignment_source: data.source || AssignmentSource.MANUAL_HRM8,
                    pipeline_stage: 'SOURCING',
                    pipeline_progress: 0,
                },
            });

            // 4. Update Consultant count
            await tx.consultant.update({
                where: { id: data.consultantId },
                data: { current_jobs: { increment: 1 } },
            });

            return assignment;
        });
    }

    async unassign(jobId: string) {
        return prisma.$transaction(async (tx) => {
            const activeAssignments = await tx.consultantJobAssignment.findMany({
                where: { job_id: jobId, status: 'ACTIVE' },
            });

            for (const assignment of activeAssignments) {
                await tx.consultantJobAssignment.update({
                    where: { id: assignment.id },
                    data: { status: 'INACTIVE' },
                });

                await tx.consultant.update({
                    where: { id: assignment.consultant_id },
                    data: { current_jobs: { decrement: 1 } },
                });
            }

            await tx.job.update({
                where: { id: jobId },
                data: {
                    region_id: null,
                    assigned_consultant_id: null,
                    assignment_mode: undefined,
                    assignment_source: null,
                },
            });
        });
    }

    async findConsultantsByJob(jobId: string) {
        return prisma.consultantJobAssignment.findMany({
            where: { job_id: jobId, status: 'ACTIVE' },
            include: {
                consultant: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
        });
    }

    async findJobsForAllocation(filters: any) {
        const { regionId, regionIds, companyId, consultantId, search, limit = 20, offset = 0, assignmentStatus = 'ALL' } = filters;

        const where: Prisma.JobWhereInput = {
            status: { in: ['OPEN', 'ON_HOLD'] },
        };

        if (assignmentStatus === 'UNASSIGNED') {
            where.assigned_consultant_id = null;
        } else if (assignmentStatus === 'ASSIGNED') {
            where.assigned_consultant_id = { not: null };
        }

        if (regionId) where.region_id = regionId;
        if (regionIds) where.region_id = { in: regionIds };
        if (companyId) where.company_id = companyId;
        if (consultantId) where.assigned_consultant_id = consultantId;

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { job_code: { contains: search, mode: 'insensitive' } },
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
                        select: { id: true, name: true }
                    }
                }
            }),
            prisma.job.count({ where }),
        ]);

        return { jobs, total };
    }

    async getStats() {
        const [total, unassigned, assigned] = await Promise.all([
            prisma.job.count({ where: { status: { in: ['OPEN', 'ON_HOLD'] } } }),
            prisma.job.count({ where: { status: { in: ['OPEN', 'ON_HOLD'] }, assigned_consultant_id: null } }),
            prisma.job.count({ where: { status: { in: ['OPEN', 'ON_HOLD'] }, assigned_consultant_id: { not: null } } }),
        ]);

        return { total, unassigned, assigned };
    }
}
