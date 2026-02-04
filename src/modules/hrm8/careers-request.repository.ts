
import { BaseRepository } from '../../core/repository';
import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export class CareersRequestRepository extends BaseRepository {
    constructor() {
        super(prisma.company);
    }

    async findMany(params: { where?: Prisma.CompanyWhereInput; orderBy?: Prisma.CompanyOrderByWithRelationInput }) {
        return prisma.company.findMany({
            ...params,
            where: {
                ...params.where,
                careers_page_status: {
                    in: ['PENDING', 'APPROVED', 'REJECTED']
                }
            }
        });
    }

    async findUnique(id: string) {
        return prisma.company.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: Prisma.CompanyUpdateInput) {
        return prisma.company.update({
            where: { id },
            data,
        });
    }
}
