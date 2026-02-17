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
                select: { id: true, company_id: true, title: true, region_id: true }
            });
            if (!job) {
                return { success: false, error: 'Job not found' };
            }
            // Logic: Find consultants in the job's region or company's region
            // For now, simpler version: find first active consultant in the same region
            const regionId = job.region_id;
            if (!regionId) {
                return { success: false, error: 'Job has no region assigned' };
            }
            const consultant = await prisma_1.prisma.consultant.findFirst({
                where: {
                    region_id: regionId,
                    status: 'ACTIVE'
                },
                orderBy: {
                    current_jobs: 'asc'
                }
            });
            if (!consultant) {
                return { success: false, error: 'No active consultant found in region' };
            }
            // Assign job
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        assigned_consultant_id: consultant.id,
                        assignment_source: client_1.AssignmentSource.AUTO_RULES,
                    }
                });
                await tx.consultant.update({
                    where: { id: consultant.id },
                    data: {
                        current_jobs: { increment: 1 }
                    }
                });
                // Create assignment record if the table exists
                // In the new backend, check schema for ConsultantJobAssignment
                await tx.consultantJobAssignment.create({
                    data: {
                        consultant_id: consultant.id,
                        job_id: jobId,
                        status: 'ACTIVE',
                        assignment_source: client_1.AssignmentSource.AUTO_RULES,
                        assigned_by: 'system'
                    }
                });
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
