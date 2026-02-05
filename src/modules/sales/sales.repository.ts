import type { Prisma, Lead, LeadConversionRequest, Opportunity, Activity, CommissionWithdrawal, Consultant, Commission } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class SalesRepository extends BaseRepository {
  // Leads
  async createLead(data: Prisma.LeadCreateInput): Promise<Lead> {
    return this.prisma.lead.create({ data });
  }

  async updateLead(id: string, data: Prisma.LeadUpdateInput): Promise<Lead> {
    return this.prisma.lead.update({ where: { id }, data });
  }

  async findLeadById(id: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { id } });
  }

  async findLeads(filters: Prisma.LeadWhereInput): Promise<Lead[]> {
    return this.prisma.lead.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      include: {
        company: { select: { id: true, name: true } }
      }
    });
  }

  async deleteLead(id: string): Promise<Lead> {
    return this.prisma.lead.delete({ where: { id } });
  }

  // Conversion Requests
  async createConversionRequest(data: Prisma.LeadConversionRequestCreateInput): Promise<LeadConversionRequest> {
    return this.prisma.leadConversionRequest.create({ data });
  }

  async updateConversionRequest(id: string, data: Prisma.LeadConversionRequestUpdateInput): Promise<LeadConversionRequest> {
    return this.prisma.leadConversionRequest.update({ where: { id }, data });
  }

  async findConversionRequests(filters: Prisma.LeadConversionRequestWhereInput): Promise<LeadConversionRequest[]> {
    return this.prisma.leadConversionRequest.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      include: {
        lead: { select: { id: true, company_name: true } },
        company: { select: { id: true, name: true } }
      }
    });
  }

  async findConversionRequestById(id: string): Promise<LeadConversionRequest | null> {
    return this.prisma.leadConversionRequest.findUnique({
      where: { id },
      include: {
        lead: true,
        company: true
      }
    });
  }

  // Opportunities
  async createOpportunity(data: Prisma.OpportunityCreateInput): Promise<Opportunity> {
    return this.prisma.opportunity.create({ data });
  }

  async updateOpportunity(id: string, data: Prisma.OpportunityUpdateInput): Promise<Opportunity> {
    return this.prisma.opportunity.update({ where: { id }, data });
  }

  async findOpportunityById(id: string): Promise<Opportunity | null> {
    return this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, domain: true }
        }
      }
    });
  }

  async findOpportunities(filters: Prisma.OpportunityWhereInput): Promise<Opportunity[]> {
    return this.prisma.opportunity.findMany({
      where: filters,
      include: {
        company: {
          select: { id: true, name: true, domain: true }
        }
      },
      orderBy: { updated_at: 'desc' }
    });
  }

  async deleteOpportunity(id: string): Promise<Opportunity> {
    return this.prisma.opportunity.delete({ where: { id } });
  }

  // Activities
  async createActivity(data: Prisma.ActivityCreateInput): Promise<Activity> {
    return this.prisma.activity.create({ data });
  }

  async updateActivity(id: string, data: Prisma.ActivityUpdateInput): Promise<Activity> {
    return this.prisma.activity.update({ where: { id }, data });
  }

  async findActivities(filters: Prisma.ActivityWhereInput, limit?: number): Promise<Activity[]> {
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

  // Companies
  async findCompanies(filters: Prisma.CompanyWhereInput): Promise<any[]> {
    return this.prisma.company.findMany({
      where: filters,
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

  async findCompanyById(id: string): Promise<any> {
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

  // Commissions
  async findCommissions(filters: Prisma.CommissionWhereInput): Promise<Commission[]> {
    return this.prisma.commission.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      include: {
        job: { select: { id: true, title: true, company: { select: { name: true } } } },
        subscription: { select: { id: true, name: true, company: { select: { name: true } } } }
      }
    });
  }

  // Withdrawals
  async createWithdrawal(data: Prisma.CommissionWithdrawalCreateInput): Promise<CommissionWithdrawal> {
    return this.prisma.commissionWithdrawal.create({ data });
  }

  async updateWithdrawal(id: string, data: Prisma.CommissionWithdrawalUpdateInput): Promise<CommissionWithdrawal> {
    return this.prisma.commissionWithdrawal.update({ where: { id }, data });
  }

  async findWithdrawalById(id: string): Promise<CommissionWithdrawal | null> {
    return this.prisma.commissionWithdrawal.findUnique({ where: { id } });
  }

  async findWithdrawals(filters: Prisma.CommissionWithdrawalWhereInput): Promise<CommissionWithdrawal[]> {
    return this.prisma.commissionWithdrawal.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  // Consultant
  async updateConsultant(id: string, data: Prisma.ConsultantUpdateInput): Promise<Consultant> {
    return this.prisma.consultant.update({ where: { id }, data });
  }

  async findConsultantById(id: string): Promise<Consultant | null> {
    return this.prisma.consultant.findUnique({ where: { id } });
  }

  // Dashboard Stats
  async getDashboardStats(consultantId: string): Promise<any> {
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

    const leadStats = {
      total: leads.length,
      converted: leads.filter(l => l.status === 'CONVERTED').length,
      conversion_rate: leads.length > 0
        ? Math.round((leads.filter(l => l.status === 'CONVERTED').length / leads.length) * 100)
        : 0
    };

    const totalEarned = commissions.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
    const pendingEarned = commissions.filter(c => c.status === 'PENDING').reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
    const paidEarned = commissions.filter(c => c.status === 'PAID').reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);

    const commissionStats = {
      total: totalEarned,
      pending: pendingEarned,
      paid: paidEarned
    };

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
      active_subscriptions: companiesCount
    };

    const recentCommissions = await this.prisma.commission.findMany({
      where: { consultant_id: consultantId },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    const mappedActivity = activities.map(a => ({
      type: a.opportunity_id ? 'OPPORTUNITY' : (a.lead_id ? 'LEAD' : 'ACTIVITY'),
      description: a.subject,
      date: a.created_at,
      status: 'COMPLETED',
      amount: 0
    }));

    const mappedCommissions = recentCommissions.map(c => ({
      type: 'COMMISSION',
      description: c.description || 'Commission Earned',
      date: c.created_at,
      status: c.status,
      amount: Number(c.amount)
    }));

    const combinedActivity = [...mappedActivity, ...mappedCommissions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      leads: leadStats,
      commissions: commissionStats,
      companies: companyStats,
      recent_activity: combinedActivity
    };
  }
}
