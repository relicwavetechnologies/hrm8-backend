"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadConversionRepository = void 0;
const prisma_1 = require("../../utils/prisma");
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
};
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
};
const isIntentSnapshotColumnMissing = (error) => {
    const err = error;
    return err?.code === 'P2022' && String(err?.meta?.column || '').includes('intent_snapshot');
};
class LeadConversionRepository {
    async findMany(params) {
        try {
            return await prisma_1.prisma.leadConversionRequest.findMany({
                ...params,
                select: conversionRequestSelect
            });
        }
        catch (error) {
            if (!isIntentSnapshotColumnMissing(error))
                throw error;
            return prisma_1.prisma.leadConversionRequest.findMany({
                ...params,
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }
    async findUnique(id) {
        try {
            return await prisma_1.prisma.leadConversionRequest.findUnique({
                where: { id },
                select: conversionRequestSelect
            });
        }
        catch (error) {
            if (!isIntentSnapshotColumnMissing(error))
                throw error;
            return prisma_1.prisma.leadConversionRequest.findUnique({
                where: { id },
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }
    async update(id, data) {
        const payload = { ...data };
        try {
            return await prisma_1.prisma.leadConversionRequest.update({
                where: { id },
                data: payload,
                select: conversionRequestSelect
            });
        }
        catch (error) {
            if (!('intent_snapshot' in payload) || !isIntentSnapshotColumnMissing(error))
                throw error;
            const fallbackPayload = { ...payload };
            delete fallbackPayload.intent_snapshot;
            return prisma_1.prisma.leadConversionRequest.update({
                where: { id },
                data: fallbackPayload,
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }
    async count(where) {
        return prisma_1.prisma.leadConversionRequest.count({ where });
    }
}
exports.LeadConversionRepository = LeadConversionRepository;
