
import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export class EmailTemplateService {
    static async create(data: any) {
        return prisma.emailTemplate.create({
            data: {
                name: data.name,
                type: data.type,
                subject: data.subject,
                body: data.body,
                variables: data.variables,
                attachments: data.attachments || [],
                is_active: data.isActive,
                is_default: data.isDefault,
                is_ai_generated: data.isAiGenerated,
                company: data.company,
                user: data.user
            }
        });
    }

    static async update(id: string, data: any) {
        const updateData: any = {
            ...data,
            version: { increment: 1 }
        };

        // Map camelCase to snake_case if present
        if (data.isActive !== undefined) updateData.is_active = data.isActive;
        if (data.isDefault !== undefined) updateData.is_default = data.isDefault;
        if (data.isAiGenerated !== undefined) updateData.is_ai_generated = data.isAiGenerated;

        // Remove camelCase keys to avoid Prisma errors
        delete updateData.isActive;
        delete updateData.isDefault;
        delete updateData.isAiGenerated;

        return prisma.emailTemplate.update({
            where: { id },
            data: updateData
        });
    }

    static async findOne(id: string) {
        return prisma.emailTemplate.findUnique({
            where: { id }
        });
    }

    static async findAll(where: Prisma.EmailTemplateWhereInput = {}) {
        return prisma.emailTemplate.findMany({
            where,
            orderBy: { updated_at: 'desc' }
        });
    }

    static async remove(id: string) {
        return prisma.emailTemplate.delete({
            where: { id }
        });
    }
}
