import { Prisma, RegionalLicensee, LicenseeStatus } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class LicenseeRepository extends BaseRepository {
    async create(data: Prisma.RegionalLicenseeCreateInput): Promise<RegionalLicensee> {
        return this.prisma.regionalLicensee.create({ data });
    }

    async update(id: string, data: Prisma.RegionalLicenseeUpdateInput): Promise<RegionalLicensee> {
        return this.prisma.regionalLicensee.update({ where: { id }, data });
    }

    async findById(id: string): Promise<RegionalLicensee | null> {
        return this.prisma.regionalLicensee.findUnique({
            where: { id },
            include: {
                regions: true
            }
        });
    }

    async findAll(filters: { status?: LicenseeStatus }): Promise<RegionalLicensee[]> {
        const where: Prisma.RegionalLicenseeWhereInput = {};
        if (filters.status) where.status = filters.status;

        return this.prisma.regionalLicensee.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { regions: true }
                }
            }
        });
    }

    async delete(id: string): Promise<RegionalLicensee> {
        return this.prisma.regionalLicensee.delete({ where: { id } });
    }
}
