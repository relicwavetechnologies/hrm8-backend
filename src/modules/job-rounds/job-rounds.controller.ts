import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobRoundService } from './job-rounds.service';
import { JobRoundRepository } from './job-rounds.repository';
import { AuthenticatedRequest } from '../../types';
import { CreateJobRoundRequest, UpdateJobRoundRequest } from './job-rounds.types';

export class JobRoundController extends BaseController {
    private service: JobRoundService;

    constructor() {
        super('job-rounds');
        this.service = new JobRoundService(new JobRoundRepository());
    }

    /**
     * Get all rounds for a job
     * GET /api/job-rounds/job/:jobId
     */
    getJobRounds = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const jobId = req.params.jobId as string;

            const rounds = await this.service.getJobRounds(jobId, req.user.companyId);
            return this.sendSuccess(res, rounds);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get a single round
     * GET /api/job-rounds/:id
     */
    getRound = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const id = req.params.id as string;

            const round = await this.service.getRound(id, req.user.companyId);
            return this.sendSuccess(res, round);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Create a new round
     * POST /api/job-rounds
     */
    createRound = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const data: CreateJobRoundRequest = req.body;

            const round = await this.service.createRound(data, { companyId: req.user.companyId });
            return this.sendSuccess(res, round, 'Job round created successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Update a round
     * PUT /api/job-rounds/:id
     */
    updateRound = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const id = req.params.id as string;
            const data: UpdateJobRoundRequest = req.body;

            const round = await this.service.updateRound(id, data, req.user.companyId);
            return this.sendSuccess(res, round, 'Job round updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Delete a round
     * DELETE /api/job-rounds/:id
     */
    deleteRound = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const id = req.params.id as string;

            await this.service.deleteRound(id, req.user.companyId);
            return this.sendSuccess(res, { success: true }, 'Job round deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
