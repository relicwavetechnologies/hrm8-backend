import { prisma } from '../../utils/prisma';
import { Prisma, LeadConversionRequest, ConversionRequestStatus } from '@prisma/client';

export class LeadConversionRepository {
    async findMany(params: {
        where?: Prisma.LeadConversionRequestWhereInput;
        orderBy?: Prisma.LeadConversionRequestOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<LeadConversionRequest[]> {
        return prisma.leadConversionRequest.findMany({
            ...params,
            include: {
                lead: true,
                consultant: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                },
                region: true
            }
        });
    }

    async findUnique(id: string): Promise<LeadConversionRequest | null> {
        return prisma.leadConversionRequest.findUnique({
            where: { id },
            include: {
                lead: true,
                consultant: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                },
                region: true
            }
        });
    }

    async update(id: string, data: Prisma.LeadConversionRequestUpdateInput): Promise<LeadConversionRequest> {
        return prisma.leadConversionRequest.update({ where: { id }, data });
    }

    async count(where?: Prisma.LeadConversionRequestWhereInput): Promise<number> {
        return prisma.leadConversionRequest.count({ where });
    }
}
