import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { EmailTemplateService } from './email-template.service';
import { Hrm8AuthenticatedRequest } from '../../types';

export class EmailTemplateController extends BaseController {
    private service: EmailTemplateService;

    constructor() {
        super();
        this.service = new EmailTemplateService();
    }
    private getParam(value: string | string[] | undefined): string {
        if (Array.isArray(value)) return value[0];
        return value || '';
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const templates = await this.service.getAll(req.hrm8User?.licenseeId);
            return this.sendSuccess(res, templates);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const template = await this.service.create({
                ...req.body,
                createdBy: req.hrm8User?.id,
                licenseeId: req.hrm8User?.licenseeId // Optional, if regional admin
            });
            return this.sendSuccess(res, template);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            const template = await this.service.update(id, req.body);
            return this.sendSuccess(res, template);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            await this.service.delete(id);
            return this.sendSuccess(res, { message: 'Template deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getVariables = async (req: Request, res: Response) => {
        try {
            const variables = this.service.getVariables();
            return this.sendSuccess(res, variables);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    preview = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            const preview = await this.service.preview(id, req.body);
            return this.sendSuccess(res, preview);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
