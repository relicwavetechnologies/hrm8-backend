import { BaseRepository } from '../../core/repository';
import { CreateJobTemplateRequest, UpdateJobTemplateRequest } from './job-templates.types';
import { TemplateCategory } from '@prisma/client';

export class JobTemplatesRepository extends BaseRepository {
    /**
     * Create a new job template
     */
    async create(data: CreateJobTemplateRequest & { companyId: string; createdBy: string }) {
        return this.prisma.jobTemplate.create({
            data: {
                company_id: data.companyId,
                created_by: data.createdBy,
                name: data.name,
                description: data.description,
                category: data.category || TemplateCategory.OTHER,
                is_shared: data.isShared || false,
                source_job_id: data.sourceJobId,
                job_data: data.jobData,
                usage_count: 0,
            },
        });
    }

    /**
     * Find all templates for a company
     */
    async findAll(companyId: string) {
        return this.prisma.jobTemplate.findMany({
            where: {
                company_id: companyId,
            },
            orderBy: {
                created_at: 'desc',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    }

    /**
     * Find a template by ID
     */
    async findById(id: string) {
        return this.prisma.jobTemplate.findUnique({
            where: { id },
        });
    }

    /**
     * Update a template
     */
    async update(id: string, data: UpdateJobTemplateRequest) {
        // Filter out undefined values to avoid overwriting with null/undefined if Prisma behaves strictly
        // Although Prisma usually ignores undefined in update
        return this.prisma.jobTemplate.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                category: data.category,
                is_shared: data.isShared,
                job_data: data.jobData,
            },
        });
    }

    /**
     * Delete a template
     */
    async delete(id: string) {
        return this.prisma.jobTemplate.delete({
            where: { id },
        });
    }

    /**
     * Increment usage count
     */
    async recordUsage(id: string) {
        return this.prisma.jobTemplate.update({
            where: { id },
            data: {
                usage_count: {
                    increment: 1,
                },
                last_used_at: new Date(),
            },
        });
    }

    /**
     * Find Job by ID (helper to get job data)
     */
    async findJobById(jobId: string) {
        return this.prisma.job.findUnique({
            where: { id: jobId }
        });
    }
}
