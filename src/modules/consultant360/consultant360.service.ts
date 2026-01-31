import { BaseService } from '../../core/service';
import { Consultant360Repository } from './consultant360.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';

export class Consultant360Service extends BaseService {
  constructor(private repository: Consultant360Repository) {
    super();
  }

  // --- Dashboard ---
  async getDashboard(consultantId: string) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const dashboardData = await this.repository.getDashboardStats(consultantId);

    // Calculate stats
    const leadStats = {
      total: dashboardData.leads.length,
      new: dashboardData.leads.filter(l => l.status === 'NEW').length,
      contacted: dashboardData.leads.filter(l => l.status === 'CONTACTED').length,
      converted: dashboardData.leads.filter(l => l.status === 'CONVERTED').length
    };

    const opportunityStats = {
      total: dashboardData.opportunities.length,
      totalValue: dashboardData.opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0),
      weightedValue: dashboardData.opportunities.reduce((sum, opp) => sum + ((opp.amount || 0) * (opp.probability || 0) / 100), 0)
    };

    const commissionStats = {
      pending: dashboardData.commissions.filter(c => c.status === 'PENDING').length,
      confirmed: dashboardData.commissions.filter(c => c.status === 'CONFIRMED').length,
      totalEarned: dashboardData.commissions.reduce((sum, c) => sum + (c.amount || 0), 0),
      availableForWithdrawal: dashboardData.commissions
        .filter(c => c.status === 'CONFIRMED')
        .reduce((sum, c) => sum + (c.amount || 0), 0)
    };

    return {
      consultant: {
        id: consultant.id,
        name: consultant.name,
        email: consultant.email
      },
      leadStats,
      opportunityStats,
      commissionStats,
      recentActivity: dashboardData.activities
    };
  }

  // --- Leads ---
  async getLeads(consultantId: string, filters?: { status?: string; region?: string }) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const where: any = {
      OR: [
        { assigned_consultant_id: consultantId },
        { created_by: consultantId },
        { referred_by: consultantId }
      ]
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.region) where.region_id = filters.region;

    return this.repository.findLeads(where);
  }

  async createLead(consultantId: string, data: any) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    if (!data.company_name || !data.email || !data.country) {
      throw new HttpException(400, 'Missing required fields: company_name, email, country');
    }

    return this.repository.createLead({
      company_name: data.company_name,
      email: data.email,
      phone: data.phone || null,
      website: data.website || null,
      country: data.country,
      city: data.city || null,
      state_province: data.state || null,
      creator: { connect: { id: consultantId } },
      status: 'NEW',
      lead_source: data.source || 'WEBSITE'
    });
  }

  async submitConversionRequest(consultantId: string, leadId: string, data: any) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const lead = await this.repository.findLeadById(leadId);
    if (!lead) throw new HttpException(404, 'Lead not found');
    if (lead.status === 'CONVERTED') throw new HttpException(400, 'Lead is already converted');

    if (!consultant.region_id) {
      throw new HttpException(400, 'Consultant does not have an assigned region');
    }

    return this.repository.createConversionRequest({
      lead: { connect: { id: leadId } },
      consultant: { connect: { id: consultantId } },
      region: { connect: { id: consultant.region_id } },
      company_name: data.company_name,
      email: data.email,
      phone: data.phone || null,
      website: data.website || null,
      country: data.country,
      city: data.city || null,
      state_province: data.state || null,
      agent_notes: data.notes || null,
      status: 'PENDING'
    });
  }

  // --- Earnings ---
  async getEarnings(consultantId: string) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    return this.repository.getEarnings(consultantId);
  }

  // --- Commissions ---
  async getCommissions(consultantId: string, filters?: { status?: string }) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const where: any = { consultant_id: consultantId };
    if (filters?.status) where.status = filters.status;

    return this.repository.findCommissions(where);
  }

  // --- Balance ---
  async getBalance(consultantId: string) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const account = await this.repository.getAccountBalance(consultantId);
    if (!account) throw new HttpException(404, 'Wallet account not found');

    return {
      balance: account.balance,
      totalCredits: account.total_credits || 0,
      totalDebits: account.total_debits || 0,
      currency: 'USD',
      status: account.status
    };
  }

  // --- Withdrawals ---
  async requestWithdrawal(consultantId: string, data: any) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const { amount, paymentMethod, paymentDetails, commissionIds, notes } = data;

    if (!amount || !paymentMethod || !commissionIds) {
      throw new HttpException(400, 'Missing required fields: amount, paymentMethod, commissionIds');
    }

    if (amount <= 0) {
      throw new HttpException(400, 'Amount must be greater than 0');
    }

    const account = await this.repository.getAccountBalance(consultantId);
    if (!account) throw new HttpException(404, 'Wallet account not found');

    if (account.balance < amount) {
      throw new HttpException(400, 'Insufficient balance for withdrawal');
    }

    return this.repository.createWithdrawal({
      consultant: { connect: { id: consultantId } },
      amount,
      payment_method: paymentMethod,
      payment_details: paymentDetails,
      commission_ids: commissionIds,
      notes,
      status: 'PENDING',
      requested_at: new Date()
    });
  }

  async getWithdrawals(consultantId: string, filters?: { status?: string }) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const where: any = { consultant_id: consultantId };
    if (filters?.status) where.status = filters.status;

    return this.repository.findWithdrawals(where);
  }

  async cancelWithdrawal(withdrawalId: string, consultantId: string) {
    const withdrawal = await this.repository.findWithdrawalById(withdrawalId);
    if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');

    if (withdrawal.consultant_id !== consultantId) {
      throw new HttpException(403, 'Unauthorized');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new HttpException(400, `Cannot cancel a ${withdrawal.status} withdrawal`);
    }

    return this.repository.updateWithdrawal(withdrawalId, { status: 'CANCELLED' });
  }

  async executeWithdrawal(withdrawalId: string, consultantId: string) {
    const withdrawal = await this.repository.findWithdrawalById(withdrawalId);
    if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');

    if (withdrawal.consultant_id !== consultantId) {
      throw new HttpException(403, 'Unauthorized');
    }

    if (withdrawal.status !== 'APPROVED') {
      throw new HttpException(400, 'Withdrawal must be approved before execution');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
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
  async initiateStripeOnboarding(consultantId: string) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    // Generate Stripe Connect OAuth URL
    const clientId = process.env.STRIPE_CLIENT_ID;
    const redirectUri = `${process.env.API_URL || 'http://localhost:3000'}/api/consultant360/stripe/callback`;

    const stripeUrl = `https://connect.stripe.com/oauth/authorize?client_id=${clientId}&state=${consultantId}&redirect_uri=${redirectUri}&stripe_user[business_type]=individual&stripe_user[email]=${consultant.email}`;

    return {
      onboardingUrl: stripeUrl,
      message: 'Redirect to this URL to complete Stripe onboarding'
    };
  }

  async getStripeStatus(consultantId: string) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    return {
      accountId: consultant.stripe_account_id || null,
      status: consultant.stripe_account_status || 'NOT_CONNECTED',
      onboardedAt: consultant.stripe_onboarded_at || null
    };
  }

  async getStripeLoginLink(consultantId: string) {
    const consultant = await this.repository.findConsultant(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    if (!consultant.stripe_account_id) {
      throw new HttpException(400, 'Stripe account not connected');
    }

    // Generate Stripe dashboard login link
    const loginLink = `https://dashboard.stripe.com/account`;

    return {
      dashboardUrl: loginLink,
      accountId: consultant.stripe_account_id
    };
  }
}
