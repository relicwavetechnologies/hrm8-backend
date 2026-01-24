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
}
