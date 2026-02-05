import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';
import { CommissionService } from '../commission/commission.service';
import { HttpException } from '../../core/http-exception';
import { JobStatus } from '@prisma/client';

/**
 * Employer Controller
 * Handles specialized employer workflows like hire approvals and job management.
 */
export class EmployerController extends BaseController {
    constructor() {
        super('employer');
    }

    /**
     * Get jobs belonging to the employer's company
     * Endpoint: GET /api/employer/jobs
     */
    getJobs = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            if (!user || !user.companyId) {
                throw new HttpException(401, 'Unauthorized: Company context required');
            }

            const { status, page, limit, search } = req.query;

            const where: any = {
                company_id: user.companyId
            };

            if (status) {
                where.status = status as JobStatus;
            }

            if (search) {
                where.OR = [
                    { title: { contains: search as string, mode: 'insensitive' } },
                    { job_code: { contains: search as string, mode: 'insensitive' } }
                ];
            }

            const take = limit ? parseInt(limit as string) : 10;
            const skip = page ? (parseInt(page as string) - 1) * take : 0;

            const [jobs, total] = await Promise.all([
                prisma.job.findMany({
                    where,
                    take,
                    skip,
                    orderBy: { created_at: 'desc' },
                    include: {
                        _count: {
                            select: { applications: true }
                        }
                    }
                }),
                prisma.job.count({ where })
            ]);

            return this.sendSuccess(res, {
                jobs,
                pagination: {
                    total,
                    page: page ? parseInt(page as string) : 1,
                    limit: take,
                    pages: Math.ceil(total / take)
                }
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Change job status (e.g., Close/Open)
     * Endpoint: PATCH /api/employer/jobs/:jobId/status
     */
    changeJobStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const { jobId } = req.params;
            const { status } = req.body;

            if (!user || !user.companyId) {
                throw new HttpException(401, 'Unauthorized: Company context required');
            }

            const job = await prisma.job.findUnique({
                where: { id: jobId as string }
            });

            if (!job) {
                throw new HttpException(404, 'Job not found');
            }

            if (job.company_id !== user.companyId) {
                throw new HttpException(403, 'Access Denied: This job does not belong to your company');
            }

            const updatedJob = await prisma.job.update({
                where: { id: jobId as string },
                data: { status: status as JobStatus }
            });

            return this.sendSuccess(res, updatedJob, `Job status updated to ${status}`);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Approve a hire/placement
     * Endpoint: POST /api/employer/hires/:applicationId/approve
     */
    approveHire = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const applicationId = req.params.applicationId as string;

            if (!user || !user.companyId) {
                throw new HttpException(401, 'Unauthorized: Company context required');
            }

            // 1. Fetch Application with Job details to verify ownership
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    job: true,
                    candidate: true
                }
            }) as any;

            if (!application) {
                throw new HttpException(404, 'Application not found');
            }

            // 2. Security Check: ensure job belongs to user's company
            if (application.job.company_id !== user.companyId) {
                throw new HttpException(403, 'Access Denied: This application does not belong to your company');
            }

            // 3. Status Check: Must be marked HIRED by consultant first
            if (application.status !== 'HIRED' && application.stage !== 'OFFER_ACCEPTED') {
                throw new HttpException(400, `Candidate must be marked as HIRED by consultant before approval. Current status: ${application.status}`);
            }

            // 4. Confirm Commission
            this.logger.info(`🏢 Company ${user.companyId} approving hire for Application ${applicationId}`);

            const commissionResult = await CommissionService.confirmCommissionForJob(application.job.id);

            if (!commissionResult.success) {
                this.logger.error(`❌ Commission Confirmation Failed: ${commissionResult.error}`);
                // We return success but with warning if commission confirmation had issues
            }

            return this.sendSuccess(res, {
                applicationId,
                jobTitle: application.job.title,
                commissionConfirmed: commissionResult.success
            }, 'Hire approved and commission confirmed.');

        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
