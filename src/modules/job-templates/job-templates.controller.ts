import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobTemplatesService } from './job-templates.service';
import { JobTemplatesRepository } from './job-templates.repository';
import { AuthenticatedRequest } from '../../types';

export class JobTemplatesController extends BaseController {
    private service: JobTemplatesService;

    constructor() {
        super('job-templates');
        this.service = new JobTemplatesService(new JobTemplatesRepository());
    }

    /**
     * Create a template from an existing job
     * POST /api/job-templates/from-job/:jobId
     */
    createFromJob = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('Unauthorized'), 401);
            }
            const { jobId } = req.params;
            const { name } = req.body;

            const result = await this.service.createFromJob(req.params.jobId as string, name, { companyId: req.user.companyId as string, id: req.user.id });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Create a new template manually
     * POST /api/job-templates/
     */
    createTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const result = await this.service.createTemplate(req.body, { companyId: req.user.companyId as string, id: req.user.id });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Get all templates for the company
     * GET /api/job-templates/
     */
    getTemplates = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const result = await this.service.getTemplates(req.user.companyId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Get a specific template
     * GET /api/job-templates/:id
     */
    getTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const result = await this.service.getTemplate(req.params.id as string, req.user.companyId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Get only the job data from a template
     * GET /api/job-templates/:id/job-data
     */
    getTemplateJobData = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const result = await this.service.getTemplateJobData(req.params.id as string, req.user.companyId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Update a template
     * PUT /api/job-templates/:id
     */
    updateTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const result = await this.service.updateTemplate(req.params.id as string, req.body, req.user.companyId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Delete a template
     * DELETE /api/job-templates/:id
     */
    deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            await this.service.deleteTemplate(req.params.id as string, req.user.companyId as string);
            return this.sendSuccess(res, { success: true });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    /**
     * Record template usage
     * POST /api/job-templates/:id/use
     */
    recordUsage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const result = await this.service.recordUsage(req.params.id as string, req.user.companyId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
