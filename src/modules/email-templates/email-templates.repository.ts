import { BaseRepository } from '../../core/repository';
import { Prisma } from '@prisma/client';

export class EmailTemplateRepository extends BaseRepository {
    /**
     * Create a new email template
     */
    async create(data: Prisma.EmailTemplateCreateInput) {
        return this.prisma.emailTemplate.create({
            data,
        });
    }

    /**
     * Update an email template
     */
    async update(id: string, data: Prisma.EmailTemplateUpdateInput) {
        return this.prisma.emailTemplate.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete an email template
     */
    async delete(id: string) {
        return this.prisma.emailTemplate.delete({
            where: { id },
        });
    }

    /**
     * Find a template by ID
     */
    async findById(id: string) {
        return this.prisma.emailTemplate.findUnique({
            where: { id },
        });
    }

    /**
     * Find template by ID and Company ID
     */
    async findByIdAndCompany(id: string, companyId: string) {
        return this.prisma.emailTemplate.findFirst({
            where: {
                id,
                company_id: companyId,
            },
        });
    }

    /**
     * Find all templates for a company
     */
    async findAllByCompany(companyId: string) {
        return this.prisma.emailTemplate.findMany({
            where: {
                company_id: companyId,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    /**
     * Find templates by type (category)
     */
    async findByType(companyId: string, type: any) {
        return this.prisma.emailTemplate.findMany({
            where: {
                company_id: companyId,
                type: type,
            },
        });
    }
}
