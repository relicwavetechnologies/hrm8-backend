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
    intent_snapshot: true,
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

const conversionRequestSelectWithoutIntentSnapshot = {
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

const isIntentSnapshotColumnMissing = (error: unknown): boolean => {
    const err = error as { code?: string; meta?: { column?: string } };
    return err?.code === 'P2022' && String(err?.meta?.column || '').includes('intent_snapshot');
};

export class LeadConversionRepository {
    async findMany(params: {
        where?: Prisma.LeadConversionRequestWhereInput;
        orderBy?: Prisma.LeadConversionRequestOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<any[]> {
        try {
            return await prisma.leadConversionRequest.findMany({
                ...params,
                select: conversionRequestSelect
            });
        } catch (error) {
            if (!isIntentSnapshotColumnMissing(error)) throw error;
            return prisma.leadConversionRequest.findMany({
                ...params,
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }

    async findUnique(id: string): Promise<any | null> {
        try {
            return await prisma.leadConversionRequest.findUnique({
                where: { id },
                select: conversionRequestSelect
            });
        } catch (error) {
            if (!isIntentSnapshotColumnMissing(error)) throw error;
            return prisma.leadConversionRequest.findUnique({
                where: { id },
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }

    async update(id: string, data: Prisma.LeadConversionRequestUpdateInput): Promise<any> {
        const payload: any = { ...(data as any) };
        try {
            return await prisma.leadConversionRequest.update({
                where: { id },
                data: payload,
                select: conversionRequestSelect
            });
        } catch (error) {
            if (!('intent_snapshot' in payload) || !isIntentSnapshotColumnMissing(error)) throw error;
            const fallbackPayload = { ...payload };
            delete fallbackPayload.intent_snapshot;
            return prisma.leadConversionRequest.update({
                where: { id },
                data: fallbackPayload,
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }

    async count(where?: Prisma.LeadConversionRequestWhereInput): Promise<number> {
        return prisma.leadConversionRequest.count({ where });
    }
}
