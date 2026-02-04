import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { EmailTemplateService } from './email-template.service';
import { Hrm8AuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';

export class EmailTemplateController extends BaseController {
    private service: EmailTemplateService;

    constructor() {
        super();
        this.service = new EmailTemplateService();
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { company_id, job_id, job_round_id, type } = req.query as Record<string, string | string[] | undefined>;
            const companyId = Array.isArray(company_id) ? company_id[0] : company_id;
            const jobId = Array.isArray(job_id) ? job_id[0] : job_id;
            const jobRoundId = Array.isArray(job_round_id) ? job_round_id[0] : job_round_id;
            const templateType = Array.isArray(type) ? type[0] : type;
            const isGlobalAdmin = req.hrm8User?.role === 'GLOBAL_ADMIN';
            const regionIds = isGlobalAdmin ? undefined : req.assignedRegionIds;

            if (companyId && regionIds && regionIds.length > 0) {
                const company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { region_id: true },
                });
                if (!company || !company.region_id || !regionIds.includes(company.region_id)) {
                    throw new HttpException(403, 'Access denied for company');
                }
            }

            const templates = await this.service.getAll({
                companyId: companyId,
                jobId: jobId,
                jobRoundId: jobRoundId,
                type: templateType as any,
                regionIds,
            });
            return this.sendSuccess(res, templates);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.body.company_id as string | undefined;
            if (!companyId) throw new HttpException(400, 'company_id is required');

            const isGlobalAdmin = req.hrm8User?.role === 'GLOBAL_ADMIN';
            const regionIds = isGlobalAdmin ? undefined : req.assignedRegionIds;
            if (regionIds && regionIds.length > 0) {
                const company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { region_id: true },
                });
                if (!company || !company.region_id || !regionIds.includes(company.region_id)) {
                    throw new HttpException(403, 'Access denied for company');
                }
            }

            const template = await this.service.create({
                ...req.body,
                created_by: req.body.created_by,
            });
            return this.sendSuccess(res, template);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const idRaw = (req.params as any).id as string | string[] | undefined;
            const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
            if (!id) throw new HttpException(400, 'id is required');
            const isGlobalAdmin = req.hrm8User?.role === 'GLOBAL_ADMIN';
            const regionIds = isGlobalAdmin ? undefined : req.assignedRegionIds;
            if (regionIds && regionIds.length > 0) {
                const template = await prisma.emailTemplate.findUnique({
                    where: { id },
                    include: { company: { select: { region_id: true } } },
                });
                if (!template?.company?.region_id || !regionIds.includes(template.company.region_id)) {
                    throw new HttpException(403, 'Access denied for template');
                }
            }
            const template = await this.service.update(id, req.body);
            return this.sendSuccess(res, template);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const idRaw = (req.params as any).id as string | string[] | undefined;
            const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
            if (!id) throw new HttpException(400, 'id is required');
            const isGlobalAdmin = req.hrm8User?.role === 'GLOBAL_ADMIN';
            const regionIds = isGlobalAdmin ? undefined : req.assignedRegionIds;
            if (regionIds && regionIds.length > 0) {
                const template = await prisma.emailTemplate.findUnique({
                    where: { id },
                    include: { company: { select: { region_id: true } } },
                });
                if (!template?.company?.region_id || !regionIds.includes(template.company.region_id)) {
                    throw new HttpException(403, 'Access denied for template');
                }
            }
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
            const idRaw = (req.params as any).id as string | string[] | undefined;
            const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
            if (!id) throw new HttpException(400, 'id is required');
            const preview = await this.service.preview(id, req.body);
            return this.sendSuccess(res, preview);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
