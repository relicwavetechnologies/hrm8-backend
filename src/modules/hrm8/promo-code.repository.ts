import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export class PromoCodeRepository {
    async findMany(params?: Prisma.PromoCodeFindManyArgs) {
        return prisma.promoCode.findMany({
            ...params,
            orderBy: { created_at: 'desc' },
        });
    }

    async findByCode(code: string) {
        return prisma.promoCode.findUnique({ where: { code } });
    }

    async create(data: Prisma.PromoCodeCreateInput) {
        return prisma.promoCode.create({ data });
    }

    async update(id: string, data: Prisma.PromoCodeUpdateInput) {
        return prisma.promoCode.update({ where: { id }, data });
    }
}
