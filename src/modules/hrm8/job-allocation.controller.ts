import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { jobAllocationService } from './job-allocation.service';
import { AuthenticatedRequest } from '../../types';

export class JobAllocationController extends BaseController {
    constructor() {
        super('job-allocation');
    }

    getAssignmentInfo = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const jobId = req.params.jobId as string;
            const info = await jobAllocationService.getAssignmentInfo(jobId);
            return this.sendSuccess(res, info);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignConsultant = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const jobId = req.params.jobId as string;
            const { consultantId } = req.body;
            if (!consultantId) return this.sendError(res, new Error('consultantId is required'), 400);

            const result = await jobAllocationService.assignConsultantToJob(jobId, consultantId, req.user?.id);
            return this.sendSuccess(res, result, 'Consultant assigned successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignRegion = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const jobId = req.params.jobId as string;
            const { regionId } = req.body;
            if (!regionId) return this.sendError(res, new Error('regionId is required'), 400);

            const result = await jobAllocationService.assignRegionToJob(jobId, regionId);
            return this.sendSuccess(res, result, 'Region assigned successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    unassign = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const jobId = req.params.jobId as string;
            const { consultantId } = req.body;
            if (!consultantId) return this.sendError(res, new Error('consultantId is required'), 400);

            await jobAllocationService.unassignConsultantFromJob(jobId, consultantId);
            return this.sendSuccess(res, { success: true }, 'Consultant unassigned successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
