"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class SettingsRepository {
    async getSettings(group) {
        const where = {};
        if (group) {
            // Assuming keys are namespaced like 'group.key' or similar logic
            // For now, if no explicit group field, we just return all or filter by key prefix if convention exists
            where.key = { startsWith: `${group}.` };
        }
        return prisma_1.prisma.systemSettings.findMany({ where });
    }
    async updateSetting(key, value, updatedBy) {
        return prisma_1.prisma.systemSettings.upsert({
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
exports.SettingsRepository = SettingsRepository;
