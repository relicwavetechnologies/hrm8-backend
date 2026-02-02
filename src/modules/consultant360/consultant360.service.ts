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

    const dashboard = await this.repository.getDashboardStats(consultantId);
    const commissions = dashboard.commissions;

    // Helper: Sum commissions by type
    const sumAmount = (items: any[]) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // Filter commissions by type (using fixed enums)
    const recruiterCommissions = commissions.filter(c => !c.type || c.type === 'PLACEMENT' || c.type === 'RECRUITMENT_SERVICE');
    const salesCommissions = commissions.filter(c => c.type === 'SUBSCRIPTION_SALE' || c.type === 'CUSTOM');

    // Calculate total earned (Confirmed + Paid status usually counts as 'earned' for dashboards)
    const earnedFilter = (c: any) => c.status === 'CONFIRMED' || c.status === 'PAID';

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
    } catch (e) {
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

    // Fetch all commissions
    console.log(`[Consultant360Service.getEarnings] Fetching earnings for consultantId: ${consultantId}`);
    const allCommissions = await this.repository.findCommissions({ consultant_id: consultantId });
    console.log(`[Consultant360Service.getEarnings] Found ${allCommissions.length} commissions`);

    // Helper to calculate totals
    const calculateStats = (commissions: any[]) => {
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
    const recruiterCommissions = allCommissions.filter(c =>
      !c.type ||
      c.type === 'PLACEMENT' ||
      c.type === 'RECRUITMENT_SERVICE'
    );
    const salesCommissions = allCommissions.filter(c =>
      c.type === 'SUBSCRIPTION_SALE' ||
      c.type === 'CUSTOM'
    );

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
    } catch (e) {
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
