import { prisma } from '../../../utils/prisma';

export class SystemSettingsService {
  static async getSetting(key: string) {
    return prisma.systemSettings.findUnique({ where: { key } });
  }

  static async getAllSettings() {
    return prisma.systemSettings.findMany({ orderBy: { key: 'asc' } });
  }

  static async setSetting(key: string, value: any, isPublic: boolean = false, updatedBy: string = 'system') {
    return prisma.systemSettings.upsert({
      where: { key },
      update: {
        value,
        is_public: isPublic,
        updated_by: updatedBy,
      },
      create: {
        key,
        value,
        is_public: isPublic,
        updated_by: updatedBy,
      },
    });
  }

  static async getPublicSettings() {
    return prisma.systemSettings.findMany({ where: { is_public: true } });
  }
}
