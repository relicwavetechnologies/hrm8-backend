import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobAllocationService } from './job-allocation.service';
import { JobAllocationRepository } from './job-allocation.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class JobAllocationController extends BaseController {
    private jobAllocationService: JobAllocationService;

    constructor() {
        super('hrm8-job-allocation-controller');
        this.jobAllocationService = new JobAllocationService(new JobAllocationRepository());
    }
    getJobDetail = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const result = await this.jobAllocationService.getJobDetail(jobId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
    allocate = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId, consultantId, source, assignmentSource, reason } = req.body;
            const result = await this.jobAllocationService.allocate({
                jobId,
                consultantId,
                assignedBy: req.hrm8User?.id || 'unknown',
                assignedByName: req.hrm8User
                    ? `${req.hrm8User.firstName} ${req.hrm8User.lastName}`.trim()
                    : 'HRM8 admin',
                reason,
                source: source || assignmentSource,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignConsultant = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const { consultantId, source, assignmentSource, reason } = req.body;
            this.logger.info('[HRM8][JobAllocation] assignConsultant request', {
                userId: req.hrm8User?.id,
                jobId,
                consultantId,
                source: source || assignmentSource,
                reason,
            });
            const result = await this.jobAllocationService.allocate({
                jobId: jobId as string,
                consultantId: consultantId as string,
                assignedBy: req.hrm8User?.id || 'unknown',
                assignedByName: req.hrm8User
                    ? `${req.hrm8User.firstName} ${req.hrm8User.lastName}`.trim()
                    : 'HRM8 admin',
                reason: reason as string,
                source: source || assignmentSource,
            });
            this.logger.info('[HRM8][JobAllocation] assignConsultant response', {
                userId: req.hrm8User?.id,
                jobId,
                consultantId,
                success: true,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignRegion = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const { regionId } = req.body;
            const result = await this.jobAllocationService.assignRegion(
                jobId as string,
                regionId as string,
                req.hrm8User?.id || 'unknown'
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    unassign = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            await this.jobAllocationService.unassign(jobId as string);
            return this.sendSuccess(res, { message: 'Job unassigned successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deallocate = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params; // id is jobId here or assignmentId? 
            // Based on admin_routes.md: DELETE /api/hrm8/job-allocation/{id}
            await this.jobAllocationService.unassign(id as string);
            return this.sendSuccess(res, { message: 'Job deallocated successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getJobConsultants = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const result = await this.jobAllocationService.getJobConsultants(jobId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getJobsForAllocation = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { limit, offset, ...otherFilters } = req.query;
            const cleanedFilters: any = { ...otherFilters };

            // Sanitize filters: remove 'ALL', 'all', or empty string values
            Object.keys(cleanedFilters).forEach(key => {
                if (cleanedFilters[key] === 'ALL' || cleanedFilters[key] === 'all' || cleanedFilters[key] === '') {
                    delete cleanedFilters[key];
                }
            });

            const filters = {
                ...cleanedFilters,
                limit: limit ? parseInt(limit as string) : 10,
                offset: offset ? parseInt(offset as string) : 0
            };
            this.logger.info('[HRM8][JobAllocation] getJobsForAllocation request', {
                userId: req.hrm8User?.id,
                filters,
            });
            const result = await this.jobAllocationService.getJobsForAllocation(filters);
            this.logger.info('[HRM8][JobAllocation] getJobsForAllocation response', {
                userId: req.hrm8User?.id,
                total: result.total,
                returned: result.jobs?.length ?? 0,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getAssignmentInfo = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            this.logger.info('[HRM8][JobAllocation] getAssignmentInfo request', {
                userId: req.hrm8User?.id,
                jobId,
            });
            const result = await this.jobAllocationService.getAssignmentInfo(jobId as string);
            this.logger.info('[HRM8][JobAllocation] getAssignmentInfo response', {
                userId: req.hrm8User?.id,
                jobId,
                hasJob: Boolean(result?.job),
                regionId: result?.job?.regionId,
                consultantsCount: result?.consultants?.length ?? 0,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStats = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.jobAllocationService.getStats();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getByLicensee = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params; // licenseeId
            // This is slightly different, might need a service method
            // For now, filtering jobs for allocation by licensee if we can map regions
            const result = await this.jobAllocationService.getJobsForAllocation({ ...req.query, licenseeId: id });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    autoAssign = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const { reason } = req.body || {};
            this.logger.info('[HRM8][JobAllocation] autoAssign request', {
                userId: req.hrm8User?.id,
                jobId,
                reason,
            });
            const result = await this.jobAllocationService.autoAssignJob(jobId as string, {
                assignedBy: req.hrm8User?.id || 'system',
                assignedByName: req.hrm8User
                    ? `${req.hrm8User.firstName} ${req.hrm8User.lastName}`.trim()
                    : 'HRM8 admin',
                reason: reason as string,
            });
            this.logger.info('[HRM8][JobAllocation] autoAssign response', {
                userId: req.hrm8User?.id,
                jobId,
                consultantId: result?.consultantId,
                success: true,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getConsultantsForAssignment = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, role, availability, industry, language, search, limit, offset } = req.query;
            this.logger.info('[HRM8][JobAllocation] getConsultantsForAssignment request', {
                userId: req.hrm8User?.id,
                regionId,
                role,
                availability,
                industry,
                language,
                search,
                limit,
                offset,
            });
            if (!regionId) return this.sendError(res, new Error('Region ID is required'), 400);
            const result = await this.jobAllocationService.getConsultantsForAssignment({
                regionId: regionId as string,
                role: role as string,
                availability: availability as string,
                industry: industry as string,
                language: language as string,
                search: search as string,
                limit: limit ? parseInt(limit as string, 10) : undefined,
                offset: offset ? parseInt(offset as string, 10) : undefined,
            });
            this.logger.info('[HRM8][JobAllocation] getConsultantsForAssignment response', {
                userId: req.hrm8User?.id,
                regionId,
                search,
                total: result.total,
                consultantsCount: result.consultants.length,
                hasMore: result.hasMore,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
