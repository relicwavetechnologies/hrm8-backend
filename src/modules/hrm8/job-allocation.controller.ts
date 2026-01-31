import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobAllocationService } from './job-allocation.service';
import { JobAllocationRepository } from './job-allocation.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class JobAllocationController extends BaseController {
    private jobAllocationService: JobAllocationService;

    constructor() {
        super();
        this.jobAllocationService = new JobAllocationService(new JobAllocationRepository());
    }

    allocate = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId, consultantId, source } = req.body;
            const result = await this.jobAllocationService.allocate({
                jobId,
                consultantId,
                assignedBy: req.hrm8User?.id || 'unknown',
                source,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignConsultant = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const { consultantId, source } = req.body;
            const result = await this.jobAllocationService.allocate({
                jobId: jobId as string,
                consultantId: consultantId as string,
                assignedBy: req.hrm8User?.id || 'unknown',
                source,
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
            const result = await this.jobAllocationService.getJobsForAllocation(req.query);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getAssignmentInfo = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const result = await this.jobAllocationService.getPipelineForJob(jobId as string);
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
            const result = await this.jobAllocationService.autoAssignJob(jobId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getConsultantsForAssignment = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, search } = req.query;
            if (!regionId) return this.sendError(res, new Error('Region ID is required'), 400);
            const result = await this.jobAllocationService.getConsultantsForAssignment({
                regionId: regionId as string,
                search: search as string,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
