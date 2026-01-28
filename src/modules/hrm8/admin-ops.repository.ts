import { BaseRepository } from '../../core/repository';

export class AdminOpsRepository extends BaseRepository {
    async getRefundRequests() {
        // Mock
        return [];
    }

    async getConversionRequests() {
        return this.prisma.leadConversionRequest.findMany({
            include: { lead: true }
        });
    }

    async getIntegrations() {
        return this.prisma.integration.findMany();
    }
}
