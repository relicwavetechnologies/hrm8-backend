import { BaseService } from '../../core/service';
import { JobTemplatesRepository } from './job-templates.repository';
import { CreateJobTemplateRequest, UpdateJobTemplateRequest } from './job-templates.types';
import { HttpException } from '../../core/http-exception';
import { TemplateCategory } from '@prisma/client';

export class JobTemplatesService extends BaseService {
    constructor(private readonly repository: JobTemplatesRepository) {
        super();
    }

    async createFromJob(jobId: string, name: string, user: { companyId: string; id: string }) {
        const job = await this.repository.findJobById(jobId);
        if (!job) {
            throw new HttpException(404, 'Job not found');
        }

        // Check ownership
        // Job model has company_id field name as per schema
        if (job.company_id !== user.companyId) {
            throw new HttpException(403, 'Unauthorized access to job');
        }

        // Clean job data for template
        // We remove fields linked to specific job instance to avoid carrying over ID, dates, etc.
        const {
            id,
            created_at,
            updated_at,
            company_id,
            created_by,
            posting_date,
            close_date,
            views_count,
            clicks_count,
            expires_at,
            assigned_consultant_id,
            assignment_source,
            payment_status,
            payment_completed_at,
            ...jobData
        } = job as any;

        return this.repository.create({
            name: name || `Template from ${job.title}`,
            sourceJobId: jobId,
            jobData: jobData,
            companyId: user.companyId,
            createdBy: user.id,
            category: TemplateCategory.OTHER,
        });
    }

    async createTemplate(data: CreateJobTemplateRequest, user: { companyId: string; id: string }) {
        return this.repository.create({
            ...data,
            companyId: user.companyId,
            createdBy: user.id
        });
    }

    async getTemplates(companyId: string) {
        return this.repository.findAll(companyId);
    }

    async getTemplate(id: string, companyId: string) {
        const template = await this.repository.findById(id);
        if (!template) {
            throw new HttpException(404, 'Template not found');
        }
        if (template.company_id !== companyId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return template;
    }

    async getTemplateJobData(id: string, companyId: string) {
        const template = await this.getTemplate(id, companyId);
        return template.job_data;
    }

    async updateTemplate(id: string, data: UpdateJobTemplateRequest, companyId: string) {
        await this.getTemplate(id, companyId); // Performs auth check
        return this.repository.update(id, data);
    }

    async deleteTemplate(id: string, companyId: string) {
        await this.getTemplate(id, companyId); // Performs auth check
        return this.repository.delete(id);
    }

    async recordUsage(id: string, companyId: string) {
        await this.getTemplate(id, companyId); // Auth check
        return this.repository.recordUsage(id);
    }
}
