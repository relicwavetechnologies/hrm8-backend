import { BaseRepository } from '../../core/repository';
import { Prisma } from '@prisma/client';

export class JobTemplateRepository extends BaseRepository {
    /**
     * Create a new job template
     */
    async create(data: Prisma.JobTemplateCreateInput) {
        return this.prisma.jobTemplate.create({
            data,
        });
    }

    /**
     * Update a job template
     */
    async update(id: string, data: Prisma.JobTemplateUpdateInput) {
        return this.prisma.jobTemplate.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete a job template
     */
    async delete(id: string) {
        return this.prisma.jobTemplate.delete({
            where: { id },
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
     * Find all templates for a company
     */
    async findAllByCompany(companyId: string) {
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
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Find template by ID and Company ID to ensure ownership
     */
    async findByIdAndCompany(id: string, companyId: string) {
        return this.prisma.jobTemplate.findFirst({
            where: {
                id,
                company_id: companyId,
            },
        });
    }

    /**
     * Find job by ID (used for creating template from job)
     */
    async findJobById(jobId: string) {
        return this.prisma.job.findUnique({
            where: { id: jobId },
        });
    }

    /**
     * Increment usage count for a template
     */
    async incrementUsageCount(id: string) {
        return this.prisma.jobTemplate.update({
            where: { id },
            data: {
                usage_count: { increment: 1 },
                last_used_at: new Date(),
            },
        });
    }
}
