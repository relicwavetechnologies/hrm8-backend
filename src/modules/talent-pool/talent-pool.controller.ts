import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { TalentPoolService } from './talent-pool.service';
import { TalentPoolRepository } from './talent-pool.repository';
import { AuthenticatedRequest } from '../../types';
import { SearchTalentRequest, InviteCandidateRequest } from './talent-pool.types';

export class TalentPoolController extends BaseController {
    private service: TalentPoolService;

    constructor() {
        super('talent-pool');
        this.service = new TalentPoolService(new TalentPoolRepository());
    }

    /**
     * Search Talent
     */
    search = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const filters: SearchTalentRequest = {
                ...req.query,
                // Parsing numeric fields if they come as strings
                experienceMin: req.query.experienceMin ? Number(req.query.experienceMin) : undefined,
                experienceMax: req.query.experienceMax ? Number(req.query.experienceMax) : undefined,
                page: req.query.page ? Number(req.query.page) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                skills: typeof req.query.skills === 'string' ? [req.query.skills] : req.query.skills as string[],
            };

            const result = await this.service.search(filters);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Invite Candidate
     */
    invite = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('User not authenticated'));
            }
            const data: InviteCandidateRequest = req.body;
            const result = await this.service.inviteCandidate(data, req.user.id);
            return this.sendSuccess(res, result, 'Invitation sent successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get Invitation (Public)
     */
    getInvitation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { token } = req.params;
            const result = await this.service.getInvitation(token as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
