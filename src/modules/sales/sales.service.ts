import { BaseService } from '../../core/service';
import { SalesRepository } from './sales.repository';
import { Lead, LeadConversionRequest, Opportunity, Activity, OpportunityStage, ActivityType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class SalesService extends BaseService {
  constructor(private salesRepository: SalesRepository) {
    super();
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

    return this.salesRepository.createOpportunity({
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

  async getOpportunities(consultantId: string, filters: { stage?: string; companyId?: string }) {
    const where: any = { sales_agent_id: consultantId };
    if (filters.stage) where.stage = filters.stage;
    if (filters.companyId) where.company_id = filters.companyId;
    return this.salesRepository.findOpportunities(where);
  }

  async getPipelineStats(consultantId: string) {
    const opportunities = await this.salesRepository.findOpportunities({
        sales_agent_id: consultantId,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
    });

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
}
