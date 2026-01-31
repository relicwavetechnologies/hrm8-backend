import type { Prisma, Lead, LeadConversionRequest, Opportunity, Activity } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class SalesRepository extends BaseRepository {
  
  // --- Leads ---
  async createLead(data: Prisma.LeadCreateInput): Promise<Lead> {
    return this.prisma.lead.create({ data });
  }

  async updateLead(id: string, data: Prisma.LeadUpdateInput): Promise<Lead> {
    return this.prisma.lead.update({ where: { id }, data });
  }

  async findLeadById(id: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { id } });
  }

  async findLeads(filters: any): Promise<Lead[]> {
    // Implement filters as needed
    return this.prisma.lead.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  // --- Conversion Requests ---
  async createConversionRequest(data: Prisma.LeadConversionRequestCreateInput): Promise<LeadConversionRequest> {
    return this.prisma.leadConversionRequest.create({ data });
  }

  async updateConversionRequest(id: string, data: Prisma.LeadConversionRequestUpdateInput): Promise<LeadConversionRequest> {
    return this.prisma.leadConversionRequest.update({ where: { id }, data });
  }

  async findConversionRequests(filters: any): Promise<LeadConversionRequest[]> {
    return this.prisma.leadConversionRequest.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findConversionRequestById(id: string): Promise<LeadConversionRequest | null> {
    return this.prisma.leadConversionRequest.findUnique({ where: { id } });
  }

  // --- Opportunities ---
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

  async findOpportunities(filters: any): Promise<Opportunity[]> {
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

  // --- Activities ---
  async createActivity(data: Prisma.ActivityCreateInput): Promise<Activity> {
    return this.prisma.activity.create({ data });
  }

  async updateActivity(id: string, data: Prisma.ActivityUpdateInput): Promise<Activity> {
    return this.prisma.activity.update({ where: { id }, data });
  }

  async findActivities(filters: any, limit?: number): Promise<Activity[]> {
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
  async findCompanies(filters: any): Promise<any[]> {
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

  // --- Commissions ---
  async findCommissions(filters: any): Promise<any[]> {
    return this.prisma.commission.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findCommissionsByIds(ids: string[]): Promise<any[]> {
    return this.prisma.commission.findMany({
      where: { id: { in: ids } }
    });
  }

  // --- Dashboard Stats ---
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

    // Calculate lead stats
    const leadStats = {
      total: leads.length,
      new: leads.filter(l => l.status === 'NEW').length,
      contacted: leads.filter(l => l.status === 'CONTACTED').length,
      converted: leads.filter(l => l.status === 'CONVERTED').length
    };

    // Calculate opportunity stats
    const opportunityStats = {
      total: opportunities.length,
      stages: opportunities.reduce((acc: any, opp: any) => {
        acc[opp.stage] = (acc[opp.stage] || 0) + 1;
        return acc;
      }, {}),
      totalPipelineValue: opportunities.reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0),
      weightedPipelineValue: opportunities.reduce((sum: number, opp: any) => sum + ((opp.amount || 0) * (opp.probability || 0) / 100), 0)
    };

    // Calculate commission stats
    const commissionStats = {
      pending: commissions.filter(c => c.status === 'PENDING').length,
      confirmed: commissions.filter(c => c.status === 'CONFIRMED').length,
      totalEarned: commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
      availableForWithdrawal: commissions
        .filter(c => c.status === 'CONFIRMED')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
    };

    return {
      leadStats,
      opportunityStats,
      commissionStats,
      recentActivity: activities
    };
  }
}
