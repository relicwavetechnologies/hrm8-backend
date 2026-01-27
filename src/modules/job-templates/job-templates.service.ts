import { BaseService } from '../../core/service';
import { JobTemplateRepository } from './job-templates.repository';
import { HttpException } from '../../core/http-exception';
import { CreateJobTemplateRequest, UpdateJobTemplateRequest } from './job-templates.types';
import { AuthenticatedRequest } from '../../types';

export class JobTemplateService extends BaseService {
    constructor(private repository: JobTemplateRepository) {
        super();
    }

    /**
     * Create a template from an existing job
     */
    async createFromJob(jobId: string, name: string, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        // 1. Get the source job
        const job = await this.repository.findJobById(jobId);
        if (!job) {
            throw new HttpException(404, 'Job not found');
        }

        // 2. Verify company ownership
        if (job.company_id !== user.companyId) {
            throw new HttpException(403, 'You do not have permission to access this job');
        }

        // 3. Prepare job data for template
        // Remove ID, timestamps, and specific fields that shouldn't be in template
        const {
            id,
            created_at,
            updated_at,
            company_id,
            created_by,
            posting_date,
            close_date,
            status, // Templates don't have job status
            pipeline, // Pipeline progress irrelevant
            clicks_count,
            views_count,
            assignments, // Remove relation fields if any
            applications,
            ...templateData
        } = job as any;

        // 4. Create the template
        return this.repository.create({
            name: name || `Template from ${job.title}`,
            company: { connect: { id: user.companyId } },
            user: { connect: { id: user.id } },
            job: { connect: { id: jobId } },
            job_data: templateData,
            description: job.description?.substring(0, 100) || 'Created from existing job',
        });
    }

    /**
     * Create a new template from scratch
     */
    async createTemplate(data: CreateJobTemplateRequest, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        return this.repository.create({
            name: data.name,
            description: data.description,
            category: data.category,
            is_shared: data.isShared || false,
            job_data: data.jobData,
            company: { connect: { id: user.companyId } },
            user: { connect: { id: user.id } },
        });
    }

    /**
     * Get all templates for a company
     */
    async getCompanyTemplates(companyId: string) {
        return this.repository.findAllByCompany(companyId);
    }

    /**
     * Get a specific template
     */
    async getTemplate(id: string, companyId: string) {
        const template = await this.repository.findByIdAndCompany(id, companyId);
        if (!template) {
            throw new HttpException(404, 'Template not found');
        }
        return template;
    }

    /**
     * Get just the job data from a template (for populating a new job)
     */
    async getTemplateJobData(id: string, companyId: string) {
        const template = await this.getTemplate(id, companyId);

        // Increment usage count
        await this.repository.incrementUsageCount(id);

        return template.job_data;
    }

    /**
     * Record template usage (explicit route)
     */
    async recordUsage(id: string, companyId: string) {
        await this.getTemplate(id, companyId);
        return this.repository.incrementUsageCount(id);
    }

    /**
     * Update a template
     */
    async updateTemplate(id: string, data: UpdateJobTemplateRequest, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        // Verify existence and ownership
        await this.getTemplate(id, user.companyId);

        return this.repository.update(id, {
            name: data.name,
            description: data.description,
            category: data.category,
            is_shared: data.isShared,
            job_data: data.jobData,
        });
    }

    /**
     * Delete a template
     */
    async deleteTemplate(id: string, companyId: string) {
        // Verify existence and ownership
        await this.getTemplate(id, companyId);

        return this.repository.delete(id);
    }
}
