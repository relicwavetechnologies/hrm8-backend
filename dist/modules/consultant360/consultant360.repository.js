"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Consultant360Repository = void 0;
const repository_1 = require("../../core/repository");
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
};
const isIntentSnapshotColumnMissing = (error) => {
    const err = error;
    return err?.code === 'P2022' && String(err?.meta?.column || '').includes('intent_snapshot');
};
class Consultant360Repository extends repository_1.BaseRepository {
    // --- Leads ---
    async createLead(data) {
        return this.prisma.lead.create({ data });
    }
    async findLeads(filters, limit, offset) {
        return this.prisma.lead.findMany({
            where: filters,
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset
        });
    }
    async findLeadById(id) {
        return this.prisma.lead.findUnique({ where: { id } });
    }
    // --- Conversion Requests ---
    async createConversionRequest(data) {
        const payload = { ...data };
        try {
            return await this.prisma.leadConversionRequest.create({
                data: payload,
                select: conversionRequestSelect
            });
        }
        catch (error) {
            if (!('intent_snapshot' in payload) || !isIntentSnapshotColumnMissing(error)) {
                throw error;
            }
            const fallbackPayload = { ...payload };
            delete fallbackPayload.intent_snapshot;
            return this.prisma.leadConversionRequest.create({
                data: fallbackPayload,
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }
    async findConversionRequests(filters) {
        try {
            return await this.prisma.leadConversionRequest.findMany({
                where: filters,
                orderBy: { created_at: 'desc' },
                select: conversionRequestSelect
            });
        }
        catch (error) {
            if (!isIntentSnapshotColumnMissing(error))
                throw error;
            return this.prisma.leadConversionRequest.findMany({
                where: filters,
                orderBy: { created_at: 'desc' },
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }
    async findConversionRequestById(id) {
        try {
            return await this.prisma.leadConversionRequest.findUnique({
                where: { id },
                select: conversionRequestSelect
            });
        }
        catch (error) {
            if (!isIntentSnapshotColumnMissing(error))
                throw error;
            return this.prisma.leadConversionRequest.findUnique({
                where: { id },
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }
    // --- Dashboard ---
    async getDashboardStats(consultantId) {
        const [leads, opportunities, commissions, activities, jobAssignments] = await Promise.all([
            this.prisma.lead.findMany({
                where: {
                    OR: [
                        { assigned_consultant_id: consultantId },
                        { created_by: consultantId },
                        { referred_by: consultantId }
                    ]
                },
                select: { id: true, status: true, company_name: true, email: true, created_at: true }
            }),
            this.prisma.opportunity.findMany({
                where: { sales_agent_id: consultantId },
                select: { id: true, stage: true, amount: true, probability: true }
            }),
            this.prisma.commission.findMany({
                where: { consultant_id: consultantId },
                select: { id: true, status: true, amount: true, type: true, created_at: true }
            }),
            this.prisma.activity.findMany({
                where: { created_by: consultantId },
                orderBy: { created_at: 'desc' },
                take: 10,
                include: {
                    company: { select: { id: true, name: true } }
                }
            }),
            this.prisma.consultantJobAssignment.findMany({
                where: { consultant_id: consultantId, status: 'ACTIVE' },
                select: {
                    id: true,
                    assigned_at: true,
                    job: {
                        select: {
                            id: true,
                            title: true,
                            location: true,
                            company: { select: { name: true } },
                            status: true
                        }
                    }
                }
            })
        ]);
        return { leads, opportunities, commissions, activities, jobAssignments };
    }
    // --- Commissions ---
    async findCommissions(filters) {
        return this.prisma.commission.findMany({
            where: filters,
            orderBy: { created_at: 'desc' }
        });
    }
    async findCommissionsByIds(ids) {
        return this.prisma.commission.findMany({
            where: { id: { in: ids } }
        });
    }
    // --- Earnings ---
    async getEarnings(consultantId) {
        const commissions = await this.prisma.commission.findMany({
            where: { consultant_id: consultantId },
            select: { amount: true, status: true, created_at: true }
        });
        const totalEarnings = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
        const confirmedEarnings = commissions
            .filter(c => c.status === 'CONFIRMED')
            .reduce((sum, c) => sum + (c.amount || 0), 0);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const last30DaysEarnings = commissions
            .filter(c => c.created_at >= thirtyDaysAgo && c.status === 'CONFIRMED')
            .reduce((sum, c) => sum + (c.amount || 0), 0);
        return { totalEarnings, confirmedEarnings, last30DaysEarnings };
    }
    // --- Withdrawals ---
    async findWithdrawals(filters) {
        return this.prisma.commissionWithdrawal.findMany({
            where: filters,
            orderBy: { created_at: 'desc' }
        });
    }
    async createWithdrawal(data) {
        return this.prisma.commissionWithdrawal.create({ data });
    }
    async findWithdrawalById(id) {
        return this.prisma.commissionWithdrawal.findUnique({ where: { id } });
    }
    async updateWithdrawal(id, data) {
        return this.prisma.commissionWithdrawal.update({
            where: { id },
            data
        });
    }
    // --- Stripe ---
    async findConsultant(id) {
        return this.prisma.consultant.findUnique({ where: { id } });
    }
    async updateConsultant(id, data) {
        return this.prisma.consultant.update({
            where: { id },
            data
        });
    }
    // --- Virtual Account ---
    async getOrCreateAccount(ownerId) {
        let account = await this.prisma.virtualAccount.findUnique({
            where: {
                owner_type_owner_id: {
                    owner_type: 'CONSULTANT',
                    owner_id: ownerId
                }
            }
        });
        if (!account) {
            account = await this.prisma.virtualAccount.create({
                data: {
                    owner_type: 'CONSULTANT',
                    owner_id: ownerId,
                    balance: 0,
                    status: 'ACTIVE'
                }
            });
        }
        return account;
    }
    async getAccountBalance(ownerId) {
        return this.prisma.virtualAccount.findUnique({
            where: {
                owner_type_owner_id: {
                    owner_type: 'CONSULTANT',
                    owner_id: ownerId
                }
            }
        });
    }
}
exports.Consultant360Repository = Consultant360Repository;
