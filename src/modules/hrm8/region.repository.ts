import { prisma } from '../../utils/prisma';
import { Prisma, Region, RegionOwnerType } from '@prisma/client';

export class RegionRepository {
    async create(data: Prisma.RegionCreateInput): Promise<Region> {
        return prisma.region.create({ data });
    }

    async findById(id: string): Promise<Region | null> {
        return prisma.region.findUnique({
            where: { id },
            include: {
                licensee: true,
            }
        });
    }

    async findByCode(code: string): Promise<Region | null> {
        return prisma.region.findUnique({
            where: { code }
        });
    }

    async findMany(params: {
        where?: Prisma.RegionWhereInput;
        orderBy?: Prisma.RegionOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<Region[]> {
        return prisma.region.findMany({
            ...params,
            include: {
                licensee: true,
                _count: {
                    select: {
                        companies: true,
                        jobs: true,
                        consultants: true
                    }
                }
            }
        });
    }

    async update(id: string, data: Prisma.RegionUpdateInput): Promise<Region> {
        return prisma.region.update({ where: { id }, data });
    }

    async delete(id: string): Promise<Region> {
        return prisma.region.delete({ where: { id } });
    }

    async count(where?: Prisma.RegionWhereInput): Promise<number> {
        return prisma.region.count({ where });
    }

    async assignLicensee(regionId: string, licenseeId: string): Promise<Region> {
        return prisma.region.update({
            where: { id: regionId },
            data: {
                licensee: { connect: { id: licenseeId } },
                owner_type: 'LICENSEE'
            }
        });
    }

    async unassignLicensee(regionId: string): Promise<Region> {
        return prisma.region.update({
            where: { id: regionId },
            data: {
                licensee: { disconnect: true },
                owner_type: 'HRM8'
            }
        });
    }
}
