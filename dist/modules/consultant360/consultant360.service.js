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
class Consultant360Service extends service_1.BaseService {
    constructor(repository) {
        super();
        this.repository = repository;
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
        if (!consultant.region_id) {
            throw new http_exception_1.HttpException(400, 'Consultant does not have an assigned region');
        }
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
            agent_notes: data.agentNotes || data.notes || null,
            temp_password: data.tempPassword || null,
            status: 'PENDING'
        });
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
        const combined = {
            availableBalance,
            pendingBalance: recruiterEarnings.pendingCommissions + salesEarnings.pendingCommissions,
            totalEarned,
            totalWithdrawn: 0, // TODO: Fetch withdrawals to calc this
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
            currency: 'USD',
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
        return this.repository.createWithdrawal({
            consultant: { connect: { id: consultantId } },
            amount,
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
        if (withdrawal.status !== 'APPROVED') {
            throw new http_exception_1.HttpException(400, 'Withdrawal must be approved before execution');
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            const updated = await tx.commissionWithdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: 'PROCESSING',
                    processed_at: new Date()
                }
            });
            // Debit the consultant's account
            await tx.virtualAccount.update({
                where: {
                    owner_type_owner_id: {
                        owner_type: 'CONSULTANT',
                        owner_id: consultantId
                    }
                },
                data: {
                    balance: { decrement: withdrawal.amount },
                    total_debits: { increment: withdrawal.amount }
                }
            });
            return updated;
        });
    }
    // --- Stripe ---
    async initiateStripeOnboarding(consultantId) {
        const { StripeFactory } = await Promise.resolve().then(() => __importStar(require('../stripe/stripe.factory')));
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        let accountId = consultant.stripe_account_id;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const returnPath = '/consultant360/earnings';
        // Create account if doesn't exist
        if (!accountId) {
            const stripe = StripeFactory.getClient();
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: consultant.email,
                capabilities: { transfers: { requested: true } },
                metadata: {
                    consultant_id: consultantId,
                    role: consultant.role
                }
            });
            accountId = account.id;
            // Update DB - mock accounts auto-approve, real accounts stay pending
            await this.repository.updateConsultant(consultantId, {
                stripe_account_id: accountId,
                stripe_account_status: StripeFactory.isUsingMock() ? 'active' : 'pending',
                payout_enabled: StripeFactory.isUsingMock() ? true : false
            });
        }
        // Generate onboarding link
        const stripe = StripeFactory.getClient();
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${frontendUrl}${returnPath}?stripe_refresh=true`,
            return_url: `${frontendUrl}${returnPath}?stripe_success=true`,
            type: 'account_onboarding'
        });
        return {
            accountId,
            onboardingUrl: accountLink.url,
            accountLink: { url: accountLink.url }
        };
    }
    async getStripeStatus(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const hasAccount = !!consultant.stripe_account_id;
        // For mock/simple logic, we assume if status is 'active' or 'completed', it's good.
        // In production this might need a live fetch to Stripe.
        const isMock = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || !process.env.STRIPE_SECRET_KEY;
        // If we have an account and it's marked active/payout_enabled in DB
        const isEnabled = hasAccount && (consultant.stripe_account_status === 'active' ||
            consultant.payout_enabled === true);
        return {
            hasAccount,
            accountId: consultant.stripe_account_id || undefined,
            payoutsEnabled: isEnabled,
            chargesEnabled: isEnabled,
            detailsSubmitted: isEnabled, // specific to this flow simplification
            requiresAction: hasAccount && !isEnabled
        };
    }
    async getStripeLoginLink(consultantId) {
        const consultant = await this.repository.findConsultant(consultantId);
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        if (!consultant.stripe_account_id) {
            throw new http_exception_1.HttpException(400, 'Stripe account not connected');
        }
        // Generate Stripe dashboard login link
        const loginLink = `https://dashboard.stripe.com/account`;
        return {
            dashboardUrl: loginLink,
            accountId: consultant.stripe_account_id
        };
    }
}
exports.Consultant360Service = Consultant360Service;
