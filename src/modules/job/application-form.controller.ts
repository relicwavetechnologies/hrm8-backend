import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobService } from './job.service';
import { JobRepository } from './job.repository';
import { AuthenticatedRequest } from '../../types';
import { QuestionGenerationService } from '../ai/question-generation.service';

export class ApplicationFormController extends BaseController {
    private jobService: JobService;

    constructor() {
        super();
        this.jobService = new JobService(new JobRepository());
    }

    getApplicationForm = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Not authenticated'));
            const { id } = req.params as { id: string };
            const job = await this.jobService.getJob(id, req.user.companyId);
            return this.sendSuccess(res, job.applicationForm || {});
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateApplicationForm = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Not authenticated'));
            const { id } = req.params as { id: string };
            const job = await this.jobService.updateJob(id, req.user.companyId, {
                applicationForm: req.body
            });
            return this.sendSuccess(res, job.applicationForm, 'Application form updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    generateQuestions = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Not authenticated'));
            const { id } = req.params as { id: string };
            const job = await this.jobService.getJob(id, req.user.companyId);

            const questions = await QuestionGenerationService.generateQuestions(
                job.title,
                job.description || '',
                5
            );

            return this.sendSuccess(res, questions);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
