"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesRepository = void 0;
const repository_1 = require("../../core/repository");
const feature_flags_1 = require("../../config/feature-flags");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('sales-repo');
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
/**
 * Returns the correct select clause based on the strict mode flag.
 * In strict mode, always include intent_snapshot and never fall back.
 * In compat mode, use the try/catch fallback pattern.
 */
function getSelectClause() {
    return feature_flags_1.FeatureFlags.FF_INTENT_SNAPSHOT_STRICT
        ? conversionRequestSelect
        : conversionRequestSelect;
}
function shouldFallback(error) {
    if (feature_flags_1.FeatureFlags.FF_INTENT_SNAPSHOT_STRICT) {
        log.error('intent_snapshot column missing in strict mode – DB sync required', { error });
        return false;
    }
    return isIntentSnapshotColumnMissing(error);
}
class SalesRepository extends repository_1.BaseRepository {
    // --- Leads ---
    async createLead(data) {
        return this.prisma.lead.create({ data });
    }
    async updateLead(id, data) {
        return this.prisma.lead.update({ where: { id }, data });
    }
    async findLeadById(id) {
        return this.prisma.lead.findUnique({ where: { id } });
    }
    async findLeads(filters) {
        // Implement filters as needed
        return this.prisma.lead.findMany({
            where: filters,
            orderBy: { created_at: 'desc' }
        });
    }
    // --- Conversion Requests ---
    async createConversionRequest(data) {
        const payload = { ...data };
        try {
            return await this.prisma.leadConversionRequest.create({
                data: payload,
                select: getSelectClause()
            });
        }
        catch (error) {
            if (!('intent_snapshot' in payload) || !shouldFallback(error)) {
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
    async updateConversionRequest(id, data) {
        const payload = { ...data };
        try {
            return await this.prisma.leadConversionRequest.update({
                where: { id },
                data: payload,
                select: getSelectClause()
            });
        }
        catch (error) {
            if (!('intent_snapshot' in payload) || !shouldFallback(error)) {
                throw error;
            }
            const fallbackPayload = { ...payload };
            delete fallbackPayload.intent_snapshot;
            return this.prisma.leadConversionRequest.update({
                where: { id },
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
                select: getSelectClause()
            });
        }
        catch (error) {
            if (!shouldFallback(error))
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
                select: getSelectClause()
            });
        }
        catch (error) {
            if (!shouldFallback(error))
                throw error;
            return this.prisma.leadConversionRequest.findUnique({
                where: { id },
                select: conversionRequestSelectWithoutIntentSnapshot
            });
        }
    }
    // --- Opportunities ---
    async createOpportunity(data) {
        return this.prisma.opportunity.create({ data });
    }
    async updateOpportunity(id, data) {
        return this.prisma.opportunity.update({ where: { id }, data });
    }
    async findOpportunityById(id) {
        return this.prisma.opportunity.findUnique({
            where: { id },
            include: {
                company: {
                    select: { id: true, name: true, domain: true }
                }
            }
        });
    }
    async findOpportunities(filters) {
        const opportunities = await this.prisma.opportunity.findMany({
            where: filters,
            include: {
                company: {
                    select: { id: true, name: true, domain: true }
                }
            },
            orderBy: { updated_at: 'desc' }
        });
        // Transform to camelCase to match frontend expectations
        return opportunities.map(opp => ({
            id: opp.id,
            name: opp.name,
            stage: opp.stage,
            amount: opp.amount || 0,
            estimatedValue: opp.amount || 0,
            probability: opp.probability || 0,
            expectedCloseDate: opp.expected_close_date,
            salesAgentId: opp.sales_agent_id,
            companyId: opp.company_id,
            type: opp.type,
            currency: opp.currency,
            description: opp.description,
            lostReason: opp.lost_reason,
            closedAt: opp.closed_at,
            createdAt: opp.created_at,
            updatedAt: opp.updated_at,
            company: opp.company,
            referredBy: opp.referred_by,
            tags: opp.tags
        }));
    }
    async deleteOpportunity(id) {
        return this.prisma.opportunity.delete({ where: { id } });
    }
    // --- Activities ---
    async createActivity(data) {
        return this.prisma.activity.create({ data });
    }
    async updateActivity(id, data) {
        return this.prisma.activity.update({ where: { id }, data });
    }
    async findActivities(filters, limit) {
        return this.prisma.activity.findMany({
            where: filters,
            orderBy: { created_at: 'desc' },
            take: limit,
            include: {
                lead: { select: { id: true, company_name: true } },
                opportunity: { select: { id: true, name: true } },
                company: { select: { id: true, name: true } }
            }
        });
    }
    // --- Companies ---
    async findCompanies(filters) {
        return this.prisma.company.findMany({
            where: filters,
            select: {
                id: true,
                name: true,
                domain: true,
                country_or_region: true,
                verification_status: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' }
        });
    }
    async findCompanyById(id) {
        return this.prisma.company.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                domain: true,
                website: true,
                country_or_region: true,
                verification_status: true,
                created_at: true,
                updated_at: true
            }
        });
    }
    // --- Commissions ---
    async findCommissions(filters) {
        const commissions = await this.prisma.commission.findMany({
            where: filters,
            orderBy: { created_at: 'desc' },
            include: {
                job: { select: { id: true, title: true, company: { select: { name: true } } } },
                subscription: { select: { id: true, name: true, company: { select: { name: true } } } }
            }
        });
        // Transform to match frontend expectations
        return commissions.map(commission => ({
            id: commission.id,
            consultantId: commission.consultant_id,
            regionId: commission.region_id,
            jobId: commission.job_id || undefined,
            subscriptionId: commission.subscription_id || undefined,
            type: commission.type,
            amount: commission.amount,
            rate: commission.rate || undefined,
            description: commission.description || undefined,
            status: commission.status,
            confirmedAt: commission.confirmed_at || undefined,
            paidAt: commission.paid_at || undefined,
            commissionExpiryDate: commission.commission_expiry_date || undefined,
            paymentReference: commission.payment_reference || undefined,
            notes: commission.notes || undefined,
            createdAt: commission.created_at,
            updatedAt: commission.updated_at,
            companyName: commission.job?.company?.name || commission.subscription?.company?.name || 'Unknown'
        }));
    }
    async findCommissionsByIds(ids) {
        const commissions = await this.prisma.commission.findMany({
            where: { id: { in: ids } },
            include: {
                job: { select: { id: true, title: true, company: { select: { name: true } } } },
                subscription: { select: { id: true, name: true, company: { select: { name: true } } } }
            }
        });
        // Transform to match frontend expectations
        return commissions.map(commission => ({
            id: commission.id,
            consultantId: commission.consultant_id,
            regionId: commission.region_id,
            jobId: commission.job_id || undefined,
            subscriptionId: commission.subscription_id || undefined,
            type: commission.type,
            amount: commission.amount,
            rate: commission.rate || undefined,
            description: commission.description || undefined,
            status: commission.status,
            confirmedAt: commission.confirmed_at || undefined,
            paidAt: commission.paid_at || undefined,
            commissionExpiryDate: commission.commission_expiry_date || undefined,
            paymentReference: commission.payment_reference || undefined,
            notes: commission.notes || undefined,
            createdAt: commission.created_at,
            updatedAt: commission.updated_at,
            companyName: commission.job?.company?.name || commission.subscription?.company?.name || 'Unknown'
        }));
    }
    // --- Dashboard Stats ---
    async getDashboardStats(consultantId) {
        const [leads, opportunities, commissions, activities] = await Promise.all([
            this.prisma.lead.findMany({
                where: {
                    OR: [
                        { assigned_consultant_id: consultantId },
                        { created_by: consultantId },
                        { referred_by: consultantId }
                    ]
                },
                select: { id: true, status: true }
            }),
            this.prisma.opportunity.findMany({
                where: { sales_agent_id: consultantId },
                select: { id: true, stage: true, amount: true, probability: true }
            }),
            this.prisma.commission.findMany({
                where: { consultant_id: consultantId },
                select: { id: true, status: true, amount: true }
            }),
            this.prisma.activity.findMany({
                where: { created_by: consultantId },
                orderBy: { created_at: 'desc' },
                take: 10,
                include: {
                    company: { select: { id: true, name: true } }
                }
            })
        ]);
        // Calculate lead stats
        const leadStats = {
            total: leads.length,
            converted: leads.filter(l => l.status === 'CONVERTED').length,
            conversionRate: leads.length > 0
                ? Math.round((leads.filter(l => l.status === 'CONVERTED').length / leads.length) * 100)
                : 0
        };
        // Calculate commission stats
        const totalEarned = commissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const pendingEarned = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const paidEarned = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const commissionStats = {
            total: totalEarned,
            pending: pendingEarned,
            paid: paidEarned
        };
        // Calculate company stats (Mocking activeSubscriptions for now as it depends on billing)
        const companiesCount = await this.prisma.company.count({
            where: {
                OR: [
                    { lead: { some: { assigned_consultant_id: consultantId } } },
                    { lead: { some: { created_by: consultantId } } },
                    { lead: { some: { referred_by: consultantId } } }
                ]
            }
        });
        const companyStats = {
            total: companiesCount,
            activeSubscriptions: companiesCount // Placeholder
        };
        // Fetch recent commissions for activity feed
        const recentCommissions = await this.prisma.commission.findMany({
            where: { consultant_id: consultantId },
            orderBy: { created_at: 'desc' },
            take: 5
        });
        // Map activity for frontend
        const mappedActivity = activities.map(a => ({
            type: a.opportunity_id ? 'OPPORTUNITY' : (a.lead_id ? 'LEAD' : 'ACTIVITY'),
            description: a.subject,
            date: a.created_at,
            status: 'COMPLETED',
            amount: 0 // Opportunities have amounts, but activities are general
        }));
        // Map commissions to activity
        const mappedCommissions = recentCommissions.map(c => ({
            type: 'COMMISSION',
            description: c.description || 'Commission Earned',
            date: c.created_at,
            status: c.status,
            amount: Number(c.amount)
        }));
        // Combine and sort
        const combinedActivity = [...mappedActivity, ...mappedCommissions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
        return {
            leads: leadStats,
            commissions: commissionStats,
            companies: companyStats,
            recentActivity: combinedActivity
        };
    }
}
exports.SalesRepository = SalesRepository;
