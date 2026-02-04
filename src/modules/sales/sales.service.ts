import { BaseService } from '../../core/service';
import { SalesRepository } from './sales.repository';
import { SalesWithdrawalService } from './sales-withdrawal.service';
import { Lead, LeadConversionRequest, Opportunity, Activity, OpportunityStage, ActivityType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { SalesValidators } from './sales.validators';
import { prisma } from '../../utils/prisma';
import { notifySalesAgent } from '../notification/notification-service-singleton';

export class SalesService extends BaseService {
  private withdrawalService: SalesWithdrawalService;

  constructor(private salesRepository: SalesRepository) {
    super();
    this.withdrawalService = new SalesWithdrawalService();
  }

  // --- Opportunities ---

  private getProbabilityForStage(stage: OpportunityStage): number {
    switch (stage) {
      case 'NEW': return 10;
      case 'QUALIFICATION': return 30;
      case 'PROPOSAL': return 60;
      case 'NEGOTIATION': return 80;
      case 'CLOSED_WON': return 100;
      case 'CLOSED_LOST': return 0;
      default: return 0;
    }
  }

  async createOpportunity(data: {
    companyId: string;
    name: string;
    type: any; // OpportunityType
    stage?: OpportunityStage;
    amount?: number;
    currency?: string;
    expectedCloseDate?: Date;
    salesAgentId: string;
    description?: string;
    tags?: string[];
  }) {
    const stage = data.stage || 'NEW';
    const probability = this.getProbabilityForStage(stage);

    const opportunity = await this.salesRepository.createOpportunity({
      company: { connect: { id: data.companyId } },
      name: data.name,
      type: data.type,
      stage: stage,
      amount: data.amount,
      currency: data.currency || 'USD',
      probability: probability,
      expected_close_date: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      consultant: { connect: { id: data.salesAgentId } },
      description: data.description,
      tags: data.tags || [],
    });

    // Notify sales agent about new opportunity
    await notifySalesAgent(data.salesAgentId, {
      title: 'New Opportunity Created',
      message: `Opportunity "${data.name}" has been created with an estimated value of ${data.currency || 'USD'} ${data.amount || 0}.`,
      type: 'SALES_OPPORTUNITY_CREATED',
      actionUrl: `/sales-agent/pipeline/${opportunity.id}`
    });

    return opportunity;
  }

  async updateOpportunity(id: string, data: any) {
    let probability = data.probability;
    let closedAt: Date | null | undefined = undefined;

    if (data.stage) {
      if (probability === undefined) {
        probability = this.getProbabilityForStage(data.stage);
      }

      if (data.stage === 'CLOSED_WON' || data.stage === 'CLOSED_LOST') {
        closedAt = new Date();
      }
    }

    const updateData: any = { ...data };
    if (probability !== undefined) updateData.probability = probability;
    if (closedAt !== undefined) updateData.closed_at = closedAt;

    // Remove immutable or special fields
    delete updateData.id;
    delete updateData.companyId;
    delete updateData.salesAgentId;

    return this.salesRepository.updateOpportunity(id, updateData);
  }

  async getOpportunities(consultantId: string | null, filters: { stage?: string; companyId?: string }) {
    const where: any = {};
    if (consultantId) where.sales_agent_id = consultantId;
    if (filters.stage) where.stage = filters.stage;
    if (filters.companyId) where.company_id = filters.companyId;
    return this.salesRepository.findOpportunities(where);
  }

  async getPipelineStats(consultantId: string | null) {
    const where: any = {
      stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
    };
    if (consultantId) where.sales_agent_id = consultantId;

    const opportunities = await this.salesRepository.findOpportunities(where);

    const totalPipelineValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);

    const weightedPipelineValue = opportunities.reduce((sum, opp) => {
      const amount = opp.amount || 0;
      const prob = opp.probability || 0;
      return sum + (amount * (prob / 100));
    }, 0);

    const byStage = opportunities.reduce((acc, opp) => {
      const stage = opp.stage;
      if (!acc[stage]) {
        acc[stage] = { count: 0, value: 0 };
      }
      acc[stage].count++;
      acc[stage].value += (opp.amount || 0);
      return acc;
    }, {} as Record<string, { count: number, value: number }>);

    return {
      totalPipelineValue,
      weightedPipelineValue,
      byStage,
      dealCount: opportunities.length
    };
  }

  // --- Activities ---

  async logActivity(data: {
    companyId: string;
    leadId?: string;
    opportunityId?: string;
    type: ActivityType;
    subject: string;
    description?: string;
    createdBy: string;
    actorType?: any; // ActorType
    scheduledAt?: Date;
    dueDate?: Date;
    completedAt?: Date;
    duration?: number;
    metadata?: any;
  }) {
    const createData: any = {
      company: { connect: { id: data.companyId } },
      type: data.type,
      subject: data.subject,
      description: data.description,
      created_by: data.createdBy,
      actor_type: data.actorType || 'CONSULTANT',
      scheduled_at: data.scheduledAt ? new Date(data.scheduledAt) : null,
      due_date: data.dueDate ? new Date(data.dueDate) : null,
      completed_at: data.completedAt ? new Date(data.completedAt) : null,
      call_duration: data.duration,
      attachments: data.metadata,
    };

    if (data.leadId) createData.lead = { connect: { id: data.leadId } };
    if (data.opportunityId) createData.opportunity = { connect: { id: data.opportunityId } };

    return this.salesRepository.createActivity(createData);
  }

  async getActivities(filters: {
    companyId?: string;
    leadId?: string;
    opportunityId?: string;
    consultantId?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.companyId) where.company_id = filters.companyId;
    if (filters.leadId) where.lead_id = filters.leadId;
    if (filters.opportunityId) where.opportunity_id = filters.opportunityId;
    if (filters.consultantId) where.created_by = filters.consultantId;

    return this.salesRepository.findActivities(where, filters.limit);
  }

  // --- Dashboard ---
  async getDashboardStats(consultantId: string) {
    return this.salesRepository.getDashboardStats(consultantId);
  }

  // --- Leads ---
  async getLeads(consultantId: string, filters?: { status?: string; region?: string }) {
    const where: any = {
      OR: [
        { assigned_consultant_id: consultantId },
        { created_by: consultantId },
        { referred_by: consultantId }
      ]
    };
    if (filters?.status) where.status = filters.status;
    if (filters?.region) where.region_id = filters.region;

    return this.salesRepository.findLeads(where);
  }

  async createLead(consultantId: string, data: any) {
    SalesValidators.validateLeadData(data);

    return this.salesRepository.createLead({
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
    } as any);
  }

  async convertLead(leadId: string, consultantId: string, companyData: any) {
    const lead = await this.salesRepository.findLeadById(leadId);
    if (!lead) throw new HttpException(404, 'Lead not found');
    if (lead.status === 'CONVERTED') throw new HttpException(400, 'Lead is already converted');

    // Create company from lead data
    const company = await prisma.company.create({
      data: {
        name: companyData.company_name || lead.company_name,
        domain: companyData.website ? new URL(companyData.website).hostname : '',
        website: companyData.website || lead.website || '',
        country_or_region: companyData.country || lead.country || '',
        verification_status: 'PENDING'
      }
    });

    // Create opportunity
    await this.createOpportunity({
      companyId: company.id,
      name: `${company.name} Opportunity`,
      type: 'NEW_BUSINESS',
      salesAgentId: consultantId,
      amount: companyData.estimatedValue,
      description: companyData.notes
    });

    // Update lead status
    await this.salesRepository.updateLead(leadId, {
      status: 'CONVERTED',
      company: { connect: { id: company.id } },
      converted_at: new Date()
    } as any);

    return { lead, company };
  }

  async submitConversionRequest(consultantId: string, leadId: string, data: any) {
    const lead = await this.salesRepository.findLeadById(leadId);
    if (!lead) throw new HttpException(404, 'Lead not found');
    if (lead.status === 'CONVERTED') throw new HttpException(400, 'Lead is already converted');

    SalesValidators.validateConversionRequest(data);

    // Get the region for the conversion request
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
      select: { region_id: true }
    });

    if (!consultant?.region_id) {
      throw new HttpException(400, 'Consultant does not have an assigned region');
    }

    return this.salesRepository.createConversionRequest({
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

  // --- Conversion Requests ---
  async getConversionRequests(consultantId: string) {
    return this.salesRepository.findConversionRequests({
      consultant_id: consultantId
    });
  }

  async getConversionRequest(requestId: string, consultantId: string) {
    const request = await this.salesRepository.findConversionRequestById(requestId);
    if (!request) throw new HttpException(404, 'Conversion request not found');
    if (request.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
    return request;
  }

  async cancelConversionRequest(requestId: string, consultantId: string) {
    const request = await this.salesRepository.findConversionRequestById(requestId);
    if (!request) throw new HttpException(404, 'Conversion request not found');
    if (request.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
    if (request.status !== 'PENDING') throw new HttpException(400, 'Can only cancel pending requests');

    return this.salesRepository.updateConversionRequest(requestId, { status: 'CANCELLED' });
  }

  // --- Companies ---
  async getCompanies(consultantId: string, filters?: { region?: string; status?: string }) {
    // Companies that consultant created leads for or has opportunities with
    const where: any = {};
    if (filters?.region) where.region_id = filters.region;
    if (filters?.status) where.verification_status = filters.status;

    return this.salesRepository.findCompanies(where);
  }

  // --- Commissions ---
  async getCommissions(consultantId: string, filters?: { status?: string; dateRange?: any }) {
    const where: any = { consultant_id: consultantId };
    if (filters?.status) where.status = filters.status;

    return this.salesRepository.findCommissions(where);
  }

  // --- Withdrawals ---
  async getWithdrawalBalance(consultantId: string) {
    return this.withdrawalService.calculateBalance(consultantId);
  }

  async requestWithdrawal(consultantId: string, data: any) {
    const { amount, paymentMethod, paymentDetails, commissionIds, notes } = data;

    if (!amount || !paymentMethod || !commissionIds) {
      throw new HttpException(400, 'Missing required fields: amount, paymentMethod, commissionIds');
    }

    SalesValidators.validatePaymentMethod(paymentMethod);

    const balance = await this.withdrawalService.calculateBalance(consultantId);
    SalesValidators.validateWithdrawalAmount(amount, balance.availableBalance);

    return this.withdrawalService.requestWithdrawal(consultantId, {
      amount,
      paymentMethod,
      paymentDetails,
      commissionIds,
      notes
    });
  }

  async getWithdrawals(consultantId: string, filters?: { status?: string }) {
    return this.withdrawalService.getWithdrawals(consultantId, filters?.status);
  }

  async cancelWithdrawal(withdrawalId: string, consultantId: string) {
    return this.withdrawalService.cancelWithdrawal(withdrawalId, consultantId);
  }

  async executeWithdrawal(withdrawalId: string, consultantId: string) {
    return this.withdrawalService.executeWithdrawal(withdrawalId, consultantId);
  }

  // --- Stripe ---
  async getStripeStatus(consultantId: string) {
    return this.withdrawalService.getStripeStatus(consultantId);
  }

  async initiateStripeOnboarding(consultantId: string) {
    return this.withdrawalService.initiateStripeOnboarding(consultantId);
  }

  async getStripeLoginLink(consultantId: string) {
    return this.withdrawalService.getStripeLoginLink(consultantId);
  }
}
