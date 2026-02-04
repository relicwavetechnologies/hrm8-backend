import { prisma } from '../../../utils/prisma';

export class IntegrationAdminService {
  static async getAll() {
    return prisma.globalIntegration.findMany({
      orderBy: { provider: 'asc' },
    });
  }

  static async upsert(data: {
    provider: string;
    name: string;
    category: string;
    api_key?: string;
    api_secret?: string;
    endpoint_url?: string;
    config?: any;
    is_active?: boolean;
  }) {
    return prisma.globalIntegration.upsert({
      where: { provider: data.provider },
      update: {
        name: data.name,
        category: data.category,
        api_key: data.api_key,
        api_secret: data.api_secret,
        endpoint_url: data.endpoint_url,
        config: data.config,
        is_active: data.is_active,
      },
      create: {
        provider: data.provider,
        name: data.name,
        category: data.category,
        api_key: data.api_key,
        api_secret: data.api_secret,
        endpoint_url: data.endpoint_url,
        config: data.config,
        is_active: data.is_active ?? true,
      },
    });
  }

  static async getUsageStats() {
    return prisma.integration.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
      where: {
        status: 'ACTIVE',
      },
    });
  }
}
