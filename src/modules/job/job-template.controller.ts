import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthenticatedRequest } from '../../types';
import { BaseController } from '../../core/controller';
import { aiTemplateGeneratorService } from '../ai/ai-template-generator.service';

export class JobTemplateController extends BaseController {
    constructor() {
        super('JobTemplate');
    }

    /** GET /api/job-templates - list job templates for the user's company */
    list = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                return this.sendError(res, new Error('Company context required'), 403);
            }

            const templates = await prisma.jobTemplate.findMany({
                where: {
                    company_id: companyId
                },
                orderBy: { created_at: 'desc' },
            });

            return this.sendSuccess(res, {
                templates: templates.map(t => this.mapTemplate(t))
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /** GET /api/job-templates/:id - get one job template */
    getById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const template = await prisma.jobTemplate.findUnique({
                where: { id },
            });

            if (!template) {
                return this.sendError(res, new Error('Template not found'), 404);
            }

            if (template.company_id !== companyId && !template.is_shared) {
                return this.sendError(res, new Error('Not allowed to access this template'), 403);
            }

            return this.sendSuccess(res, {
                template: this.mapTemplate(template)
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /** DELETE /api/job-templates/:id - delete a job template */
    delete = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const template = await prisma.jobTemplate.findUnique({
                where: { id },
            });

            if (!template) {
                return this.sendError(res, new Error('Template not found'), 404);
            }

            if (template.company_id !== companyId) {
                return this.sendError(res, new Error('Not allowed to delete this template'), 403);
            }

            await prisma.jobTemplate.delete({
                where: { id },
            });

            return this.sendSuccess(res, { message: 'Template deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /** POST /api/job-templates/:id/use - increment usage count */
    use = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await prisma.jobTemplate.update({
                where: { id },
                data: {
                    usage_count: { increment: 1 },
                    last_used_at: new Date()
                }
            });
            return this.sendSuccess(res, { message: 'Usage recorded' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /** GET /api/job-templates/:id/job-data - get job data for creation */
    getTemplateJobData = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const template = await prisma.jobTemplate.findUnique({
                where: { id },
            });

            if (!template) {
                return this.sendError(res, new Error('Template not found'), 404);
            }

            return this.sendSuccess(res, this.mapJobData(template.job_data));
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /** POST /api/job-templates - create a new template */
    create = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.id;
            const { name, description, category, jobData, tags } = req.body;

            if (!companyId) {
                return this.sendError(res, new Error('Company context required'), 403);
            }

            const normalizedCategory = this.normalizeCategory(category);

            const template = await prisma.jobTemplate.create({
                data: {
                    name,
                    description,
                    category: normalizedCategory as any,
                    company_id: companyId,
                    created_by: userId || '',
                    job_data: jobData || {},
                    tags: tags || []
                }
            });

            return this.sendSuccess(res, {
                template: this.mapTemplate(template)
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /** POST /api/job-templates/from-job/:jobId - create template from existing job */
    createFromJob = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.id;
            const { id: jobId } = req.params; // Use 'id' to match common route params
            const { name, description } = req.body;

            if (!companyId) {
                return this.sendError(res, new Error('Company context required'), 403);
            }

            const job = await prisma.job.findUnique({
                where: { id: jobId }
            });

            if (!job) {
                return this.sendError(res, new Error('Job not found'), 404);
            }

            if (job.company_id !== companyId) {
                return this.sendError(res, new Error('Unauthorized'), 403);
            }

            const template = await prisma.jobTemplate.create({
                data: {
                    name: name || `Template from ${job.title}`,
                    description: description || job.description || '',
                    category: this.normalizeCategory(job.category || 'OTHER') as any,
                    company_id: companyId,
                    created_by: userId || '',
                    source_job_id: jobId,
                    job_data: job,
                    tags: []
                }
            });

            return this.sendSuccess(res, {
                template: this.mapTemplate(template)
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /** POST /api/job-templates/generate-ai - generate a structured template using AI */
    generateAI = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { prompt } = req.body;
            if (!prompt) {
                return this.sendError(res, new Error('Prompt is required'), 400);
            }

            const generated = await aiTemplateGeneratorService.generateTemplate({ prompt });
            return this.sendSuccess(res, generated);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    private mapTemplate(template: any) {
        if (!template) return null;
        return {
            id: template.id,
            companyId: template.company_id,
            createdBy: template.created_by,
            name: template.name,
            description: template.description || '',
            category: template.category,
            isShared: template.is_shared,
            sourceJobId: template.source_job_id,
            jobData: this.mapJobData(template.job_data),
            usageCount: template.usage_count || 0,
            lastUsedAt: template.last_used_at,
            createdAt: template.created_at,
            updatedAt: template.updated_at,
            tags: template.tags || []
        };
    }

    private normalizeCategory(category: string): string {
        if (!category) return 'OTHER';
        const cat = category.toUpperCase().replace(/\s+/g, '_');
        const validCategories = [
            'ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES',
            'OPERATIONS', 'HR', 'FINANCE', 'EXECUTIVE', 'OTHER'
        ];

        if (validCategories.includes(cat)) return cat;

        // Custom mappings
        if (cat === 'CUSTOMER_SUPPORT') return 'OPERATIONS';
        if (cat === 'CUSTOM') return 'OTHER';

        return 'OTHER';
    }

    private mapJobData(job: any): any {
        if (!job) return {};
        // Reuse mapping logic similar to JobService
        return {
            id: job.id,
            companyId: job.company_id,
            createdBy: job.created_by,
            jobCode: job.job_code,
            title: job.title,
            description: job.description,
            requirements: job.requirements || [],
            responsibilities: job.responsibilities || [],
            department: job.department,
            location: job.location,
            country: job.country,
            hiringMode: job.hiring_mode,
            workArrangement: job.work_arrangement,
            employmentType: job.employment_type,
            numberOfVacancies: job.number_of_vacancies,
            salaryMin: job.salary_min,
            salaryMax: job.salary_max,
            salaryCurrency: job.salary_currency,
            salaryPeriod: job.salary_period,
            salaryDescription: job.salary_description,
            experienceLevel: job.experience_level,
            status: job.status,
            visibility: job.visibility,
            stealth: job.stealth,
            promotionalTags: job.promotional_tags || [],
            videoInterviewingEnabled: job.video_interviewing_enabled,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
            postingDate: job.posting_date,
            closeDate: job.close_date
        };
    }
}
