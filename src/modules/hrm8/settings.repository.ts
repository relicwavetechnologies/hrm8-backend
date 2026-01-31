import { prisma } from '../../utils/prisma';

export class SettingsRepository {
    async getSettings(group?: string) {
        const where: any = {};
        if (group) {
            // Assuming keys are namespaced like 'group.key' or similar logic
            // For now, if no explicit group field, we just return all or filter by key prefix if convention exists
            where.key = { startsWith: `${group}.` };
        }
        return prisma.systemSettings.findMany({ where });
    }

    async updateSetting(key: string, value: any, updatedBy?: string) {
        return prisma.systemSettings.upsert({
            where: { key },
            update: {
                value,
                updated_by: updatedBy
            },
            create: {
                key,
                value,
                updated_by: updatedBy
            }
        });
    }
}
