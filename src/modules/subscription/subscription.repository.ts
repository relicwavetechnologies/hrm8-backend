import { BaseRepository } from '../../core/repository';
import { Prisma, SubscriptionStatus } from '@prisma/client';

export class SubscriptionRepository extends BaseRepository {

    async create(data: Prisma.SubscriptionCreateInput) {
        return this.prisma.subscription.create({ data });
    }

    async findById(id: string) {
        return this.prisma.subscription.findUnique({
            where: { id },
            include: { company: true }
        });
    }

    async findActiveByCompany(companyId: string) {
        return this.prisma.subscription.findFirst({
            where: {
                company_id: companyId,
                status: SubscriptionStatus.ACTIVE,
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async findManyByCompany(companyId: string) {
        return this.prisma.subscription.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' }
        });
    }

    async update(id: string, data: Prisma.SubscriptionUpdateInput) {
        return this.prisma.subscription.update({
            where: { id },
            data
        });
    }
}
