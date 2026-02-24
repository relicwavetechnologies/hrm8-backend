import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

const conversionRequestSelect = {
    id: true,
    lead_id: true,
    consultant_id: true,
    region_id: true,
    status: true,
    company_name: true,
    email: true,
    phone: true,
    website: true,
    country: true,
    city: true,
    state_province: true,
    agent_notes: true,
    reviewed_by: true,
    reviewed_at: true,
    admin_notes: true,
    decline_reason: true,
    converted_at: true,
    company_id: true,
    created_at: true,
    updated_at: true,
    temp_password: true,
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
} satisfies Prisma.LeadConversionRequestSelect;

export class LeadConversionRepository {
    async findMany(params: {
        where?: Prisma.LeadConversionRequestWhereInput;
        orderBy?: Prisma.LeadConversionRequestOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<any[]> {
        return prisma.leadConversionRequest.findMany({
            ...params,
            select: conversionRequestSelect
        });
    }

    async findUnique(id: string): Promise<any | null> {
        return prisma.leadConversionRequest.findUnique({
            where: { id },
            select: conversionRequestSelect
        });
    }

    async update(id: string, data: Prisma.LeadConversionRequestUpdateInput): Promise<any> {
        return prisma.leadConversionRequest.update({
            where: { id },
            data,
            select: conversionRequestSelect
        });
    }

    async count(where?: Prisma.LeadConversionRequestWhereInput): Promise<number> {
        return prisma.leadConversionRequest.count({ where });
    }
}
