import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { JobTemplateService } from './job-templates.service';
import { JobTemplateRepository } from './job-templates.repository';
import { AuthenticatedRequest } from '../../types';
import { CreateJobTemplateRequest, UpdateJobTemplateRequest } from './job-templates.types';

export class JobTemplateController extends BaseController {
    private service: JobTemplateService;

    constructor() {
        super('job-templates');
        this.service = new JobTemplateService(new JobTemplateRepository());
    }

    /**
     * Create template from existing job
     * POST /api/job-templates/from-job/:jobId
     */
    createFromJob = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const jobId = req.params.jobId as string;
            const { name } = req.body;

            if (!jobId) {
                return this.sendError(res, new Error('Job ID is required'), 400);
            }

            const template = await this.service.createFromJob(jobId, name, req.user);
            return this.sendSuccess(res, template, 'Template created from job');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Create new template
     * POST /api/job-templates
     */
    createTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const data: CreateJobTemplateRequest = req.body;

            if (!data.name || !data.jobData) {
                return this.sendError(res, new Error('Name and job data are required'), 400);
            }

            const template = await this.service.createTemplate(data, req.user);
            return this.sendSuccess(res, template, 'Template created successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get all templates
     * GET /api/job-templates
     */
    getTemplates = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const templates = await this.service.getCompanyTemplates(req.user.companyId);
            return this.sendSuccess(res, templates);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get single template
     * GET /api/job-templates/:id
     */
    getTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            const template = await this.service.getTemplate(id, req.user.companyId);
            return this.sendSuccess(res, template);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get template job data (for population)
     * GET /api/job-templates/:id/job-data
     */
    getTemplateJobData = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            const jobData = await this.service.getTemplateJobData(id, req.user.companyId);
            return this.sendSuccess(res, jobData);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Update template
     * PUT /api/job-templates/:id
     */
    updateTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            const data: UpdateJobTemplateRequest = req.body;

            const updatedTemplate = await this.service.updateTemplate(id, data, req.user);
            return this.sendSuccess(res, updatedTemplate, 'Template updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Delete template
     * DELETE /api/job-templates/:id
     */
    deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            await this.service.deleteTemplate(id, req.user.companyId);
            return this.sendSuccess(res, { success: true }, 'Template deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
