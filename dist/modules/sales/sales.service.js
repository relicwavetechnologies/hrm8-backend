"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const service_1 = require("../../core/service");
const sales_withdrawal_service_1 = require("./sales-withdrawal.service");
const http_exception_1 = require("../../core/http-exception");
const sales_validators_1 = require("./sales.validators");
const prisma_1 = require("../../utils/prisma");
const notification_service_singleton_1 = require("../notification/notification-service-singleton");
class SalesService extends service_1.BaseService {
    constructor(salesRepository) {
        super();
        this.salesRepository = salesRepository;
        this.withdrawalService = new sales_withdrawal_service_1.SalesWithdrawalService();
    }
    // --- Opportunities ---
    getProbabilityForStage(stage) {
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
    async createOpportunity(data) {
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
        await (0, notification_service_singleton_1.notifySalesAgent)(data.salesAgentId, {
            title: 'New Opportunity Created',
            message: `Opportunity "${data.name}" has been created with an estimated value of ${data.currency || 'USD'} ${data.amount || 0}.`,
            type: 'SALES_OPPORTUNITY_CREATED',
            actionUrl: `/sales/opportunities/${opportunity.id}`
        });
        return opportunity;
    }
    async updateOpportunity(id, data) {
        let probability = data.probability;
        let closedAt = undefined;
        if (data.stage) {
            if (probability === undefined) {
                probability = this.getProbabilityForStage(data.stage);
            }
            if (data.stage === 'CLOSED_WON' || data.stage === 'CLOSED_LOST') {
                closedAt = new Date();
            }
        }
        const updateData = { ...data };
        if (probability !== undefined)
            updateData.probability = probability;
        if (closedAt !== undefined)
            updateData.closed_at = closedAt;
        // Remove immutable or special fields
        delete updateData.id;
        delete updateData.companyId;
        delete updateData.salesAgentId;
        return this.salesRepository.updateOpportunity(id, updateData);
    }
    async getOpportunities(consultantId, filters) {
        const where = {};
        if (consultantId)
            where.sales_agent_id = consultantId;
        if (filters.stage)
            where.stage = filters.stage;
        if (filters.companyId)
            where.company_id = filters.companyId;
        return this.salesRepository.findOpportunities(where);
    }
    async getPipelineStats(consultantId) {
        const where = {
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
        };
        if (consultantId)
            where.sales_agent_id = consultantId;
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
        }, {});
        return {
            totalPipelineValue,
            weightedPipelineValue,
            byStage,
            dealCount: opportunities.length
        };
    }
    // --- Activities ---
    async logActivity(data) {
        const createData = {
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
        if (data.leadId)
            createData.lead = { connect: { id: data.leadId } };
        if (data.opportunityId)
            createData.opportunity = { connect: { id: data.opportunityId } };
        return this.salesRepository.createActivity(createData);
    }
    async getActivities(filters) {
        const where = {};
        if (filters.companyId)
            where.company_id = filters.companyId;
        if (filters.leadId)
            where.lead_id = filters.leadId;
        if (filters.opportunityId)
            where.opportunity_id = filters.opportunityId;
        if (filters.consultantId)
            where.created_by = filters.consultantId;
        return this.salesRepository.findActivities(where, filters.limit);
    }
    // --- Dashboard ---
    async getDashboardStats(consultantId) {
        return this.salesRepository.getDashboardStats(consultantId);
    }
    // --- Leads ---
    async getLeads(consultantId, filters) {
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
        return this.salesRepository.findLeads(where);
    }
    async createLead(consultantId, data) {
        sales_validators_1.SalesValidators.validateLeadData(data);
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            include: { region: true },
        });
        if (!consultant?.region_id) {
            throw new http_exception_1.HttpException(400, 'Consultant must have an assigned region to create leads');
        }
        const companyName = data.company_name ?? data.companyName;
        return this.salesRepository.createLead({
            company_name: companyName,
            email: data.email,
            phone: data.phone || null,
            website: data.website || null,
            country: consultant.region?.country || data.country || 'Unknown',
            city: data.city || null,
            state_province: data.state || null,
            region: { connect: { id: consultant.region_id } },
            creator: { connect: { id: consultantId } },
            status: 'NEW',
            lead_source: data.source || 'WEBSITE',
        });
    }
    async convertLead(leadId, consultantId, companyData) {
        const lead = await this.salesRepository.findLeadById(leadId);
        if (!lead)
            throw new http_exception_1.HttpException(404, 'Lead not found');
        if (lead.status === 'CONVERTED')
            throw new http_exception_1.HttpException(400, 'Lead is already converted');
        // Create company from lead data
        const company = await prisma_1.prisma.company.create({
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
        });
        return { lead, company };
    }
    async submitConversionRequest(consultantId, leadId, data) {
        const lead = await this.salesRepository.findLeadById(leadId);
        if (!lead)
            throw new http_exception_1.HttpException(404, 'Lead not found');
        if (lead.status === 'CONVERTED')
            throw new http_exception_1.HttpException(400, 'Lead is already converted');
        // Get the region for the conversion request
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { region_id: true }
        });
        if (!consultant?.region_id) {
            throw new http_exception_1.HttpException(400, 'Consultant does not have an assigned region');
        }
        // Use lead data for company/contact info – form only sends agentNotes and tempPassword
        return this.salesRepository.createConversionRequest({
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
    // --- Conversion Requests ---
    async getConversionRequests(consultantId) {
        return this.salesRepository.findConversionRequests({
            consultant_id: consultantId
        });
    }
    async getConversionRequest(requestId, consultantId) {
        const request = await this.salesRepository.findConversionRequestById(requestId);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Conversion request not found');
        if (request.consultant_id !== consultantId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        return request;
    }
    async cancelConversionRequest(requestId, consultantId) {
        const request = await this.salesRepository.findConversionRequestById(requestId);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Conversion request not found');
        if (request.consultant_id !== consultantId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        if (request.status !== 'PENDING')
            throw new http_exception_1.HttpException(400, 'Can only cancel pending requests');
        return this.salesRepository.updateConversionRequest(requestId, { status: 'CANCELLED' });
    }
    // --- Companies ---
    async getCompanies(consultantId, filters) {
        // Companies that consultant created leads for or has opportunities with
        const where = {};
        if (filters?.region)
            where.region_id = filters.region;
        if (filters?.status)
            where.verification_status = filters.status;
        return this.salesRepository.findCompanies(where);
    }
    // --- Commissions ---
    async getCommissions(consultantId, filters) {
        const where = { consultant_id: consultantId };
        if (filters?.status)
            where.status = filters.status;
        return this.salesRepository.findCommissions(where);
    }
    // --- Withdrawals ---
    async getWithdrawalBalance(consultantId) {
        return this.withdrawalService.calculateBalance(consultantId);
    }
    async requestWithdrawal(consultantId, data) {
        const { amount, paymentMethod, paymentDetails, commissionIds, notes } = data;
        if (!amount || !paymentMethod || !commissionIds) {
            throw new http_exception_1.HttpException(400, 'Missing required fields: amount, paymentMethod, commissionIds');
        }
        sales_validators_1.SalesValidators.validatePaymentMethod(paymentMethod);
        const balance = await this.withdrawalService.calculateBalance(consultantId);
        sales_validators_1.SalesValidators.validateWithdrawalAmount(amount, balance.availableBalance);
        return this.withdrawalService.requestWithdrawal(consultantId, {
            amount,
            paymentMethod,
            paymentDetails,
            commissionIds,
            notes
        });
    }
    async getWithdrawals(consultantId, filters) {
        return this.withdrawalService.getWithdrawals(consultantId, filters?.status);
    }
    async cancelWithdrawal(withdrawalId, consultantId) {
        return this.withdrawalService.cancelWithdrawal(withdrawalId, consultantId);
    }
    async executeWithdrawal(withdrawalId, consultantId) {
        return this.withdrawalService.executeWithdrawal(withdrawalId, consultantId);
    }
    // --- Stripe ---
    async getStripeStatus(consultantId) {
        return this.withdrawalService.getStripeStatus(consultantId);
    }
    async initiateStripeOnboarding(consultantId) {
        return this.withdrawalService.initiateStripeOnboarding(consultantId);
    }
    async getStripeLoginLink(consultantId) {
        return this.withdrawalService.getStripeLoginLink(consultantId);
    }
}
exports.SalesService = SalesService;
