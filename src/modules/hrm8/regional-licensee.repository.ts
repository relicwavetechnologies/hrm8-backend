import { prisma } from '../../utils/prisma';
import { Prisma, RegionalLicensee } from '@prisma/client';

export class RegionalLicenseeRepository {
    async create(data: Prisma.RegionalLicenseeCreateInput): Promise<RegionalLicensee> {
        return prisma.regionalLicensee.create({ data });
    }

    async findById(id: string): Promise<RegionalLicensee | null> {
        return prisma.regionalLicensee.findUnique({
            where: { id },
            include: {
                regions: true
            }
        });
    }

    async findByEmail(email: string): Promise<RegionalLicensee | null> {
        return prisma.regionalLicensee.findFirst({
            where: { email }
        });
    }

    async update(id: string, data: Prisma.RegionalLicenseeUpdateInput): Promise<RegionalLicensee> {
        return prisma.regionalLicensee.update({ where: { id }, data });
    }

    async delete(id: string): Promise<RegionalLicensee> {
        return prisma.regionalLicensee.delete({ where: { id } });
    }

    async findMany(params: {
        where?: Prisma.RegionalLicenseeWhereInput;
        orderBy?: Prisma.RegionalLicenseeOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<RegionalLicensee[]> {
        return prisma.regionalLicensee.findMany({
            ...params,
            include: {
                _count: { select: { regions: true } }
            }
        });
    }

    async count(where?: Prisma.RegionalLicenseeWhereInput): Promise<number> {
        return prisma.regionalLicensee.count({ where });
    }

    async getStats() {
        const [total, active, suspended] = await Promise.all([
            prisma.regionalLicensee.count(),
            prisma.regionalLicensee.count({ where: { status: 'ACTIVE' } }),
            prisma.regionalLicensee.count({ where: { status: 'SUSPENDED' } }),
        ]);
        return { total, active, suspended };
    }
}
