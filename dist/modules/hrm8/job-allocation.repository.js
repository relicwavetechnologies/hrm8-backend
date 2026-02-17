"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobAllocationRepository = void 0;
const prisma_1 = require("../../utils/prisma");
const client_1 = require("@prisma/client");
const notification_service_singleton_1 = require("../notification/notification-service-singleton");
const logger_1 = require("../../utils/logger");
class JobAllocationRepository {
    constructor() {
        this.logger = logger_1.Logger.create('hrm8-job-allocation-repository');
    }
    async assignToConsultant(data) {
        const runAssignmentTransaction = async () => prisma_1.prisma.$transaction(async (tx) => {
            const job = await tx.job.findUnique({
                where: { id: data.jobId },
                select: {
                    id: true,
                    title: true,
                    assigned_consultant_id: true,
                },
            });
            if (!job) {
                throw new Error('Job not found');
            }
            const targetConsultant = await tx.consultant.findUnique({
                where: { id: data.consultantId },
                select: { id: true, first_name: true, last_name: true, current_jobs: true },
            });
            if (!targetConsultant) {
                throw new Error('Target consultant not found');
            }
            const previousActiveAssignment = await tx.consultantJobAssignment.findFirst({
                where: { job_id: data.jobId, status: 'ACTIVE' },
                include: {
                    consultant: {
                        select: { id: true, first_name: true, last_name: true, current_jobs: true },
                    },
                },
                orderBy: { assigned_at: 'desc' },
            });
            const previousConsultantId = previousActiveAssignment?.consultant_id || job.assigned_consultant_id || null;
            const isReassignment = Boolean(previousConsultantId && previousConsultantId !== data.consultantId);
            const isSameConsultant = previousConsultantId === data.consultantId;
            if (isReassignment && !data.reason?.trim()) {
                throw new Error('Reason is required for reassignment');
            }
            if (isSameConsultant && previousActiveAssignment) {
                await tx.job.update({
                    where: { id: data.jobId },
                    data: {
                        region_id: data.regionId,
                        assigned_consultant_id: data.consultantId,
                        assignment_source: data.source || client_1.AssignmentSource.MANUAL_HRM8,
                        assignment_mode: 'MANUAL',
                    },
                });
                return {
                    assignment: previousActiveAssignment,
                    job,
                    previousConsultant: previousActiveAssignment.consultant,
                    targetConsultant,
                    isReassignment: false,
                    isSameConsultant: true,
                };
            }
            await tx.consultantJobAssignment.updateMany({
                where: { job_id: data.jobId, status: 'ACTIVE' },
                data: { status: 'INACTIVE', pipeline_stage: 'CLOSED' },
            });
            await tx.job.update({
                where: { id: data.jobId },
                data: {
                    region_id: data.regionId,
                    assigned_consultant_id: data.consultantId,
                    assignment_source: data.source || client_1.AssignmentSource.MANUAL_HRM8,
                    assignment_mode: 'MANUAL',
                },
            });
            const newAssignment = await tx.consultantJobAssignment.create({
                data: {
                    job_id: data.jobId,
                    consultant_id: data.consultantId,
                    assigned_by: data.assignedBy,
                    status: 'ACTIVE',
                    assignment_source: data.source || client_1.AssignmentSource.MANUAL_HRM8,
                    pipeline_stage: isReassignment
                        ? previousActiveAssignment?.pipeline_stage || 'SOURCING'
                        : 'SOURCING',
                    pipeline_progress: isReassignment
                        ? previousActiveAssignment?.pipeline_progress || 0
                        : 0,
                    pipeline_note: isReassignment
                        ? previousActiveAssignment?.pipeline_note || null
                        : null,
                    pipeline_updated_at: new Date(),
                    pipeline_updated_by: data.assignedBy,
                },
            });
            if (isReassignment && previousConsultantId) {
                const previousConsultant = previousActiveAssignment?.consultant ||
                    (await tx.consultant.findUnique({
                        where: { id: previousConsultantId },
                        select: { id: true, first_name: true, last_name: true, current_jobs: true },
                    }));
                if (previousConsultant) {
                    await tx.consultant.update({
                        where: { id: previousConsultant.id },
                        data: { current_jobs: Math.max((previousConsultant.current_jobs || 0) - 1, 0) },
                    });
                }
            }
            await tx.consultant.update({
                where: { id: data.consultantId },
                data: { current_jobs: { increment: 1 } },
            });
            return {
                assignment: newAssignment,
                job,
                previousConsultant: previousActiveAssignment?.consultant || null,
                targetConsultant,
                isReassignment,
                isSameConsultant: false,
            };
        }, { maxWait: 10000, timeout: 30000 });
        let assignmentResult;
        try {
            assignmentResult = await runAssignmentTransaction();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('Transaction not found')) {
                this.logger.warn('[HRM8][JobAllocation] Retrying assignment transaction after transaction-not-found', {
                    jobId: data.jobId,
                    consultantId: data.consultantId,
                });
                assignmentResult = await runAssignmentTransaction();
            }
            else {
                throw error;
            }
        }
        const previousName = assignmentResult.previousConsultant
            ? `${assignmentResult.previousConsultant.first_name} ${assignmentResult.previousConsultant.last_name}`
            : 'Unassigned';
        const targetName = `${assignmentResult.targetConsultant.first_name} ${assignmentResult.targetConsultant.last_name}`;
        const reasonText = data.reason?.trim() || 'No reason provided';
        const changedBy = data.assignedByName || 'HRM8 admin';
        try {
            await (0, notification_service_singleton_1.notifyConsultant)(data.consultantId, {
                title: assignmentResult.isReassignment ? 'Job Reassigned To You' : 'New Job Assigned',
                message: assignmentResult.isReassignment
                    ? `You are now assigned to "${assignmentResult.job.title}" from ${previousName}. Reason: ${reasonText}. Updated by: ${changedBy}.`
                    : `You have been assigned to "${assignmentResult.job.title}". Reason: ${reasonText}. Updated by: ${changedBy}.`,
                type: 'JOB_ASSIGNED',
                actionUrl: `/consultant/jobs/${data.jobId}`,
            });
        }
        catch (error) {
            this.logger.warn('[HRM8][JobAllocation] New consultant notification failed', {
                jobId: data.jobId,
                consultantId: data.consultantId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        if (assignmentResult.isReassignment && assignmentResult.previousConsultant) {
            try {
                await (0, notification_service_singleton_1.notifyConsultant)(assignmentResult.previousConsultant.id, {
                    title: 'Job Reassigned Away',
                    message: `Your assignment on "${assignmentResult.job.title}" has been moved to ${targetName}. Reason: ${reasonText}. Updated by: ${changedBy}.`,
                    type: 'SYSTEM_ANNOUNCEMENT',
                    actionUrl: `/consultant/jobs/${data.jobId}`,
                });
            }
            catch (error) {
                this.logger.warn('[HRM8][JobAllocation] Previous consultant notification failed', {
                    jobId: data.jobId,
                    consultantId: assignmentResult.previousConsultant.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return assignmentResult.assignment;
    }
    async unassign(jobId) {
        return prisma_1.prisma.$transaction(async (tx) => {
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
    async findConsultantsByJob(jobId) {
        return prisma_1.prisma.consultantJobAssignment.findMany({
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
    async findJobsForAllocation(filters) {
        const { regionId, regionIds, companyId, consultantId, search, limit = 20, offset = 0, assignmentStatus = 'ALL' } = filters;
        const where = {
            status: { in: ['OPEN', 'ON_HOLD'] },
        };
        if (assignmentStatus === 'UNASSIGNED') {
            where.assigned_consultant_id = null;
        }
        else if (assignmentStatus === 'ASSIGNED') {
            where.assigned_consultant_id = { not: null };
        }
        if (regionId)
            where.region_id = regionId;
        if (regionIds)
            where.region_id = { in: regionIds };
        if (companyId)
            where.company_id = companyId;
        if (consultantId)
            where.assigned_consultant_id = consultantId;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { job_code: { contains: search, mode: 'insensitive' } },
                { company: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [jobs, total] = await Promise.all([
            prisma_1.prisma.job.findMany({
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
            prisma_1.prisma.job.count({ where }),
        ]);
        return { jobs, total };
    }
    async getStats() {
        const [total, unassigned, assigned] = await Promise.all([
            prisma_1.prisma.job.count({ where: { status: { in: ['OPEN', 'ON_HOLD'] } } }),
            prisma_1.prisma.job.count({ where: { status: { in: ['OPEN', 'ON_HOLD'] }, assigned_consultant_id: null } }),
            prisma_1.prisma.job.count({ where: { status: { in: ['OPEN', 'ON_HOLD'] }, assigned_consultant_id: { not: null } } }),
        ]);
        return { total, unassigned, assigned };
    }
}
exports.JobAllocationRepository = JobAllocationRepository;
