import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

const conversionRequestInclude = {
    lead: {
        select: {
            id: true,
            status: true,
            lead_source: true,
            notes: true,
            created_at: true,
            validated_at: true,
            converted_at: true,
            converted_to_company_id: true,
        },
    },
    consultant: {
        select: { id: true, first_name: true, last_name: true, email: true }
    },
    region: true,
    reviewer: {
        select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
        },
    },
    company: {
        select: {
            id: true,
            name: true,
            website: true,
            billing_currency: true,
            pricing_peg: true,
            created_at: true,
            sales_agent_id: true,
        },
    },
} satisfies Prisma.LeadConversionRequestInclude;

export class LeadConversionRepository {
    async findMany(params: {
        where?: Prisma.LeadConversionRequestWhereInput;
        orderBy?: Prisma.LeadConversionRequestOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<any[]> {
        return prisma.leadConversionRequest.findMany({
            ...params,
            include: conversionRequestInclude
        });
    }

    async findUnique(id: string): Promise<any | null> {
        return prisma.leadConversionRequest.findUnique({
            where: { id },
            include: conversionRequestInclude
        });
    }

    async update(id: string, data: Prisma.LeadConversionRequestUpdateInput): Promise<any> {
        return prisma.leadConversionRequest.update({ where: { id }, data });
    }

    async count(where?: Prisma.LeadConversionRequestWhereInput): Promise<number> {
        return prisma.leadConversionRequest.count({ where });
    }
}
