import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { EmailTemplateService } from './email-templates.service';
import { EmailTemplateRepository } from './email-templates.repository';
import { AuthenticatedRequest } from '../../types';
import { CreateEmailTemplateRequest, UpdateEmailTemplateRequest } from './email-templates.types';

export class EmailTemplateController extends BaseController {
    private service: EmailTemplateService;

    constructor() {
        super('email-templates');
        this.service = new EmailTemplateService(new EmailTemplateRepository());
    }

    /**
     * Create template
     * POST /api/email-templates
     */
    createTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const data: CreateEmailTemplateRequest = req.body;
            if (!data.name || !data.subject || !data.body) {
                return this.sendError(res, new Error('Name, subject and body are required'), 400);
            }
            if (!req.user?.companyId) return this.sendError(res, new Error('Unauthorized'), 401);

            const template = await this.service.createTemplate(data, req.user);
            return this.sendSuccess(res, template, 'Template created successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get all templates
     * GET /api/email-templates
     */
    getTemplates = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) return this.sendError(res, new Error('Unauthorized'), 401);

            const templates = await this.service.getCompanyTemplates(req.user.companyId as string);
            return this.sendSuccess(res, templates);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get single template
     * GET /api/email-templates/:id
     */
    getTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            const template = await this.service.getTemplate(id, req.user.companyId as string);
            return this.sendSuccess(res, template);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Update template
     * PUT /api/email-templates/:id
     */
    updateTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            const data: UpdateEmailTemplateRequest = req.body;

            const updatedTemplate = await this.service.updateTemplate(id, data, req.user);
            return this.sendSuccess(res, updatedTemplate, 'Template updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Delete template
     * DELETE /api/email-templates/:id
     */
    deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            await this.service.deleteTemplate(id, req.user.companyId as string);
            return this.sendSuccess(res, { success: true }, 'Template deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Generate AI template
     * POST /api/email-templates/generate-ai
     */
    generateAITemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const data = req.body;
            if (!data.prompt) {
                return this.sendError(res, new Error('Prompt is required'), 400);
            }

            const result = await this.service.generateAITemplate(data);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Enhance template using AI
     * POST /api/email-templates/enhance-ai
     */
    enhanceTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { body, instructions } = req.body;
            if (!body || !instructions) {
                return this.sendError(res, new Error('Body and instructions are required'), 400);
            }

            const result = await this.service.enhanceTemplate({ body, instructions });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get available variables
     * GET /api/email-templates/variables
     */
    getVariables = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const variables = this.service.getVariables();
            return this.sendSuccess(res, variables);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Preview template
     * POST /api/email-templates/:id/preview
     */
    previewTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) return this.sendError(res, new Error('Unauthorized'), 401);

            const id = req.params.id as string;
            const { data } = req.body;

            const preview = await this.service.previewTemplate(id, req.user.companyId as string, data);
            return this.sendSuccess(res, preview);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
