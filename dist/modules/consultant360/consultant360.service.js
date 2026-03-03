"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Consultant360Service = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
const conversion_intent_util_1 = require("../sales/conversion-intent.util");
const commission_payout_service_1 = require("../payouts/commission-payout.service");
class Consultant360Service extends service_1.BaseService {
    constructor(repository) {
        super();
        this.repository = repository;
        /** @deprecated Use initiatePayoutOnboarding */
        this.initiateStripeOnboarding = this.initiatePayoutOnboarding.bind(this);
        /** @deprecated Use getPayoutStatus */
        this.getStripeStatus = this.getPayoutStatus.bind(this);
        /** @deprecated Use getPayoutDashboardLink */
        this.getStripeLoginLink = this.getPayoutDashboardLink.bind(this);
    }
    async resolveConsultantCurrency(consultantId) {
        const account = await this.repository.getAccountBalance(consultantId);
        if (account?.id) {
            const latestTxCurrency = await prisma_1.prisma.virtualTransaction.findFirst({
                where: {
                    virtual_account_id: account.id,
                    billing_currency_used: { not: null }
                },
                orderBy: { created_at: 'desc' },
                select: { billing_currency_used: true }
            });
            if (latestTxCurrency?.billing_currency_used) {
                return latestTxCurrency.billing_currency_used;
            }
        }
        const latestCommissionCurrency = await prisma_1.prisma.commission.findFirst({
            where: { consultant_id: consultantId },
            orderBy: { created_at: 'desc' },
            select: {
                subscription: { select: { currency: true } },
                job: { select: { payment_currency: true } }
            }
        });
        return latestCommissionCurrency?.subscription?.currency
            || latestCommissionCurrency?.job?.payment_currency
            || 'USD';
    }
    // --- Dashboard ---
    async getDashboard(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const dashboard = await this.repository.getDashboardStats(consultantId);
        const commissions = dashboard.commissions;
        // Helper: Sum commissions by type
        const sumAmount = (items) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        // Filter commissions by type (using fixed enums)
        const recruiterCommissions = commissions.filter(c => !c.type || c.type === 'PLACEMENT' || c.type === 'RECRUITMENT_SERVICE');
        const salesCommissions = commissions.filter(c => c.type === 'SUBSCRIPTION_SALE' || c.type === 'CUSTOM');
        // Calculate total earned (Confirmed + Paid status usually counts as 'earned' for dashboards)
        const earnedFilter = (c) => c.status === 'CONFIRMED' || c.status === 'PAID';
        // Calculate stats matching frontend interface
        const stats = {
            totalEarnings: sumAmount(commissions.filter(earnedFilter)),
            activeJobs: dashboard.jobAssignments.length,
            activeLeads: dashboard.leads.filter(l => l.status !== 'CONVERTED' && l.status !== 'LOST').length,
            totalSubscriptionSales: salesCommissions.length,
            salesEarnings: sumAmount(salesCommissions.filter(earnedFilter)),
            recruiterEarnings: sumAmount(recruiterCommissions.filter(earnedFilter)),
            pendingBalance: sumAmount(commissions.filter(c => c.status === 'PENDING')),
            availableBalance: 0, // Should fetch from wallet or sum confirmed unwithdrawn
            totalPlacements: recruiterCommissions.length,
            conversionRate: dashboard.leads.length > 0 ? Math.round((dashboard.leads.filter(l => l.status === 'CONVERTED').length / dashboard.leads.length) * 100) : 0
        };
        // Calculate Wallet Balance (Mock or fetch real)
        try {
            const wallet = await this.repository.getAccountBalance(consultantId);
            stats.availableBalance = wallet?.balance || 0;
        }
        catch (e) {
            // Ignore
        }
        // Mock Active Jobs (Need repository method for proper count)
        // const activeJobs = await this.repository.countActiveJobs(consultantId); 
        // stats.activeJobs = activeJobs;
        // Calculate Monthly Trend (Last 12 months)
        const monthlyTrend = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            // Filter commissions for this month
            const monthCommissions = commissions.filter(c => {
                const cDate = new Date(c.created_at);
                return cDate.getMonth() === date.getMonth() && cDate.getFullYear() === year;
            });
            const mRecruiter = monthCommissions.filter(c => !c.type || c.type === 'PLACEMENT' || c.type === 'RECRUITMENT_SERVICE');
            const mSales = monthCommissions.filter(c => c.type === 'SUBSCRIPTION_SALE' || c.type === 'CUSTOM');
            monthlyTrend.push({
                month: monthName,
                year: year,
                recruiterEarnings: sumAmount(mRecruiter.filter(earnedFilter)),
                salesEarnings: sumAmount(mSales.filter(earnedFilter)),
                total: sumAmount(monthCommissions.filter(earnedFilter))
            });
        }
        return {
            stats,
            monthlyTrend,
            activeJobs: dashboard.jobAssignments.map(assignment => ({
                id: assignment.job.id,
                title: assignment.job.title,
                companyName: assignment.job.company.name,
                location: assignment.job.location || 'N/A',
                assignedAt: assignment.assigned_at,
                status: assignment.job.status
            })),
            activeLeads: dashboard.leads.slice(0, 5).map(l => ({
                id: l.id,
                companyName: l.company_name,
                contactEmail: l.email,
                status: l.status,
                createdAt: l.created_at
            }))
        };
    }
    // --- Leads ---
    async getLeads(consultantId, filters) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const where = {
            OR: [
                { assigned_consultant_id: consultantId },
                { created_by: consultantId },
                { referred_by: consultantId }
            ]
        };
        if (filters?.status)
            where.status = filters.status;
        if (filters?.region)
            where.region_id = filters.region;
        return this.repository.findLeads(where);
    }
    async createLead(consultantId, data) {
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            include: { region: true },
        });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        if (!consultant.region_id) {
            throw new http_exception_1.HttpException(400, 'Consultant must have an assigned region to create leads');
        }
        const companyName = data.company_name ?? data.companyName;
        if (!companyName || !data.email) {
            throw new http_exception_1.HttpException(400, 'Missing required fields: company name, email');
        }
        return this.repository.createLead({
            company_name: companyName,
            email: data.email,
            phone: data.phone || null,
            website: data.website || null,
            country: consultant.region?.country || 'Unknown',
            city: data.city || null,
            state_province: data.state || null,
            region: { connect: { id: consultant.region_id } },
            creator: { connect: { id: consultantId } },
            status: 'NEW',
            lead_source: data.source || 'WEBSITE',
        });
    }
    async submitConversionRequest(consultantId, leadId, data) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const lead = await this.repository.findLeadById(leadId);
        if (!lead)
            throw new http_exception_1.HttpException(404, 'Lead not found');
        if (lead.status === 'CONVERTED')
            throw new http_exception_1.HttpException(400, 'Lead is already converted');
        const { assertLeadInConsultantRegion, validateRegionCurrencyMapping } = await Promise.resolve().then(() => __importStar(require('../sales/conversion-request-validators')));
        assertLeadInConsultantRegion(lead, consultant);
        await validateRegionCurrencyMapping(consultant.region_id);
        const normalizedIntentSnapshot = (0, conversion_intent_util_1.normalizeConversionIntentSnapshot)(data?.intentSnapshot ?? data?.intent_snapshot);
        const baseAgentNotes = data.agentNotes || data.notes || null;
        const serializedIntentSnapshot = normalizedIntentSnapshot
            ? `\n\n[Intent Snapshot]\n${JSON.stringify(normalizedIntentSnapshot)}`
            : '';
        // Use lead data for company/contact info – form only sends agentNotes and tempPassword
        return this.repository.createConversionRequest({
            lead: { connect: { id: leadId } },
            consultant: { connect: { id: consultantId } },
            region: { connect: { id: consultant.region_id } },
            company_name: lead.company_name,
            email: lead.email,
            phone: lead.phone || null,
            website: lead.website || null,
            country: lead.country,
            city: lead.city || null,
            state_province: lead.state_province || null,
            intent_snapshot: normalizedIntentSnapshot || undefined,
            // Keep snapshot in notes as backward-compatible fallback for environments
            // where intent_snapshot is not yet available.
            agent_notes: `${baseAgentNotes || ''}${serializedIntentSnapshot}`.trim() || null,
            temp_password: data.tempPassword || null,
            status: 'PENDING'
        });
    }
    async getConversionEligibility(leadId, consultantId) {
        const { assertLeadInConsultantRegion } = await Promise.resolve().then(() => __importStar(require('../sales/conversion-request-validators')));
        const { CurrencyAssignmentService } = await Promise.resolve().then(() => __importStar(require('../pricing/currency-assignment.service')));
        const { HttpException } = await Promise.resolve().then(() => __importStar(require('../../core/http-exception')));
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../utils/prisma')));
        const lead = await this.repository.findLeadById(leadId);
        const reasons = [];
        if (!lead)
            return { eligible: false, reasons: ['Lead not found'] };
        if (lead.status === 'CONVERTED')
            return { eligible: false, reasons: ['Lead is already converted'] };
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            return { eligible: false, reasons: ['Consultant not found'] };
        try {
            assertLeadInConsultantRegion(lead, consultant);
        }
        catch (e) {
            if (e instanceof HttpException) {
                reasons.push(e.message);
                return { eligible: false, reasons, regionId: consultant.region_id ?? undefined };
            }
            throw e;
        }
        const regionId = consultant.region_id;
        const region = await prisma.region.findUnique({ where: { id: regionId }, select: { country: true } });
        let mapping = null;
        try {
            const result = await CurrencyAssignmentService.resolveRegionCurrencyOrThrow(regionId);
            mapping = { pricingPeg: result.pricingPeg, billingCurrency: result.billingCurrency, isActive: result.isActive };
        }
        catch (e) {
            if (e instanceof HttpException) {
                reasons.push(e.message);
                return { eligible: false, reasons, regionId, regionCountry: region?.country };
            }
            throw e;
        }
        return { eligible: true, reasons: [], regionId, regionCountry: region?.country, mapping };
    }
    // --- Earnings ---
    async getEarnings(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        // Fetch all commissions
        console.log(`[Consultant360Service.getEarnings] Fetching earnings for consultantId: ${consultantId}`);
        const allCommissions = await this.repository.findCommissions({ consultant_id: consultantId });
        console.log(`[Consultant360Service.getEarnings] Found ${allCommissions.length} commissions`);
        // Helper to calculate totals
        const calculateStats = (commissions) => {
            return {
                totalRevenue: commissions.reduce((sum, c) => sum + (c.amount || 0), 0), // Mock revenue as total amount for now
                totalPlacements: commissions.length,
                totalSubscriptionSales: commissions.reduce((sum, c) => sum + (c.amount || 0), 0), // Mock sales
                totalServiceFees: 0,
                pendingCommissions: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + (c.amount || 0), 0),
                confirmedCommissions: commissions.filter(c => c.status === 'CONFIRMED').reduce((sum, c) => sum + (c.amount || 0), 0),
                paidCommissions: commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + (c.amount || 0), 0),
                commissions: commissions.map(c => ({
                    id: c.id,
                    amount: c.amount,
                    status: c.status,
                    description: c.description || 'Commission',
                    createdAt: c.created_at,
                    type: c.type || 'PLACEMENT' // Assuming type field exists or defaulting
                }))
            };
        };
        // Split by type
        const recruiterCommissions = allCommissions.filter(c => !c.type ||
            c.type === 'PLACEMENT' ||
            c.type === 'RECRUITMENT_SERVICE');
        const salesCommissions = allCommissions.filter(c => c.type === 'SUBSCRIPTION_SALE' ||
            c.type === 'CUSTOM');
        const recruiterEarnings = calculateStats(recruiterCommissions);
        const salesEarnings = calculateStats(salesCommissions);
        // Combined Stats
        const totalEarned = recruiterEarnings.confirmedCommissions + salesEarnings.confirmedCommissions +
            recruiterEarnings.paidCommissions + salesEarnings.paidCommissions; // Earned usually means confirmed + paid
        // Wallet Balance (Get actual wallet balance)
        let availableBalance = 0;
        try {
            const wallet = await this.repository.getAccountBalance(consultantId);
            availableBalance = wallet?.balance || 0;
        }
        catch (e) {
            // Ignore if no wallet
        }
        let totalWithdrawn = 0;
        try {
            const result = await prisma_1.prisma.commissionWithdrawal.aggregate({
                where: { consultant_id: consultantId, status: { in: ['COMPLETED', 'PROCESSING'] } },
                _sum: { amount: true },
            });
            totalWithdrawn = Number(result._sum.amount || 0);
        }
        catch {
            // Ignore
        }
        const combined = {
            availableBalance,
            pendingBalance: recruiterEarnings.pendingCommissions + salesEarnings.pendingCommissions,
            totalEarned,
            totalWithdrawn,
            availableCommissions: allCommissions.filter(c => c.status === 'CONFIRMED').map(c => ({
                id: c.id,
                amount: c.amount,
                description: c.description || 'Commission',
                date: c.created_at
            }))
        };
        return {
            combined,
            recruiterEarnings,
            salesEarnings
        };
    }
    // --- Commissions ---
    async requestCommission(consultantId, data) {
        const { CommissionService } = await Promise.resolve().then(() => __importStar(require('../hrm8/commission.service')));
        const { CommissionRepository } = await Promise.resolve().then(() => __importStar(require('../hrm8/commission.repository')));
        const commissionService = new CommissionService(new CommissionRepository());
        return commissionService.requestCommission({
            consultantId,
            type: data.type,
            amount: data.amount,
            jobId: data.jobId,
            subscriptionId: data.subscriptionId,
            description: data.description,
            calculateFromJob: data.calculateFromJob,
            rate: data.rate
        });
    }
    async getCommissions(consultantId, filters) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const where = { consultant_id: consultantId };
        if (filters?.status)
            where.status = filters.status;
        return this.repository.findCommissions(where);
    }
    // --- Balance ---
    async getBalance(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const account = await this.repository.getAccountBalance(consultantId);
        if (!account)
            throw new http_exception_1.HttpException(404, 'Wallet account not found');
        return {
            balance: account.balance,
            totalCredits: account.total_credits || 0,
            totalDebits: account.total_debits || 0,
            currency: await this.resolveConsultantCurrency(consultantId),
            status: account.status
        };
    }
    // --- Withdrawals ---
    async requestWithdrawal(consultantId, data) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const { amount, paymentMethod, paymentDetails, commissionIds, notes } = data;
        if (!amount || !paymentMethod || !commissionIds) {
            throw new http_exception_1.HttpException(400, 'Missing required fields: amount, paymentMethod, commissionIds');
        }
        if (amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Amount must be greater than 0');
        }
        const account = await this.repository.getAccountBalance(consultantId);
        if (!account)
            throw new http_exception_1.HttpException(404, 'Wallet account not found');
        if (account.balance < amount) {
            throw new http_exception_1.HttpException(400, 'Insufficient balance for withdrawal');
        }
        const commissionRecords = await prisma_1.prisma.commission.findMany({
            where: { id: { in: commissionIds }, consultant_id: consultantId, status: 'CONFIRMED' },
            select: { id: true, amount: true, currency: true }
        });
        const totalAmount = commissionRecords.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const commissionCurrency = commissionRecords[0]?.currency || 'USD';
        return this.repository.createWithdrawal({
            consultant: { connect: { id: consultantId } },
            amount: totalAmount,
            currency: commissionCurrency,
            payout_currency: commissionCurrency,
            payout_amount: totalAmount,
            fx_rate_used: 1.0,
            payment_method: paymentMethod,
            payment_details: paymentDetails,
            commission_ids: commissionIds,
            notes,
            status: 'PENDING'
        });
    }
    async getWithdrawals(consultantId, filters) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const where = { consultant_id: consultantId };
        if (filters?.status)
            where.status = filters.status;
        return this.repository.findWithdrawals(where);
    }
    async cancelWithdrawal(withdrawalId, consultantId) {
        const withdrawal = await this.repository.findWithdrawalById(withdrawalId);
        if (!withdrawal)
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        }
        if (withdrawal.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, `Cannot cancel a ${withdrawal.status} withdrawal`);
        }
        return this.repository.updateWithdrawal(withdrawalId, { status: 'CANCELLED' });
    }
    async executeWithdrawal(withdrawalId, consultantId) {
        const withdrawal = await this.repository.findWithdrawalById(withdrawalId);
        if (!withdrawal)
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        }
        if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
            throw new http_exception_1.HttpException(400, 'Withdrawal must be approved before execution');
        }
        return commission_payout_service_1.CommissionPayoutService.executeWithdrawalPayout(withdrawalId);
    }
    // --- Payout Provider (Airwallex) – provider-neutral method names ---
    async initiatePayoutOnboarding(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        // DB columns still named stripe_* – will be renamed during next DB migration.
        let accountId = consultant.stripe_account_id;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const returnPath = '/consultant360/earnings';
        if (!accountId) {
            accountId = `awx_benef_${consultantId.replace(/-/g, '').slice(0, 20)}`;
            await this.repository.updateConsultant(consultantId, {
                stripe_account_id: accountId,
                stripe_account_status: 'active',
                payout_enabled: true,
                stripe_onboarded_at: new Date()
            });
        }
        const onboardingUrl = `${frontendUrl}${returnPath}?airwallex_success=true`;
        return {
            provider: 'AIRWALLEX',
            accountId,
            onboardingUrl,
            accountLink: { url: onboardingUrl }
        };
    }
    async getPayoutStatus(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const hasAccount = !!consultant.stripe_account_id;
        const isEnabled = hasAccount && (consultant.stripe_account_status === 'active' ||
            consultant.payout_enabled === true);
        return {
            provider: 'AIRWALLEX',
            hasAccount,
            accountId: consultant.stripe_account_id || undefined,
            payoutsEnabled: isEnabled,
            chargesEnabled: isEnabled,
            detailsSubmitted: isEnabled,
            requiresAction: hasAccount && !isEnabled
        };
    }
    async getPayoutDashboardLink(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        if (!consultant.stripe_account_id) {
            throw new http_exception_1.HttpException(400, 'Airwallex beneficiary not connected');
        }
        const loginLink = `https://www.airwallex.com/app/login?beneficiary=${consultant.stripe_account_id}`;
        return {
            provider: 'AIRWALLEX',
            dashboardUrl: loginLink,
            url: loginLink,
            accountId: consultant.stripe_account_id
        };
    }
}
exports.Consultant360Service = Consultant360Service;
