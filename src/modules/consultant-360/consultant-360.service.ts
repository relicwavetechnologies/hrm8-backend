import { BaseService } from '../../core/service';
import { Consultant360Repository } from './consultant-360.repository';
import { ConsultantRepository } from '../consultant/consultant.repository';
import { CreateLeadRequest, ConversionRequestData, LeadFilters } from './consultant-360.types';
import { HttpException } from '../../core/http-exception';

export class Consultant360Service extends BaseService {
    private consultantRepository: ConsultantRepository;

    constructor(private repo: Consultant360Repository) {
        super();
        this.consultantRepository = new ConsultantRepository();
    }

    // Dashboard
    async getUnifiedDashboard(consultantId: string) {
        const leadStats = await this.repo.getLeadStats(consultantId);
        const commStats = await this.consultantRepository.findCommissionStats(consultantId);

        // Process lead stats
        let totalLeads = 0;
        let activeLeads = 0;
        let convertedLeads = 0;

        leadStats.forEach(stat => {
            totalLeads += stat._count;
            if (stat.status === 'CONVERTED') convertedLeads += stat._count;
            else if (stat.status !== 'LOST') activeLeads += stat._count;
        });

        return {
            leads: {
                total: totalLeads,
                active: activeLeads,
                converted: convertedLeads
            },
            earnings: {
                total: commStats.totalEarned,
                pending: commStats.pending
            },
            recentActivities: [] // TODO: Implement activity log
        };
    }

    // Leads
    async getLeads(consultantId: string, filters: LeadFilters) {
        const skip = ((filters.page || 1) - 1) * (filters.limit || 20);
        return this.repo.findLeads(consultantId, {
            ...filters,
            skip,
            take: filters.limit || 20
        });
    }

    async createLead(consultantId: string, data: CreateLeadRequest) {
        return this.repo.createLead({
            company_name: data.companyName,
            email: data.email,
            phone: data.phone,
            website: data.website,
            country: data.country,
            city: data.city,
            state_province: data.state,
            notes: data.notes,
            consultant: { connect: { id: consultantId } },
            creator: { connect: { id: consultantId } },
            lead_source: 'MANUAL_ENTRY',
            status: 'NEW'
        });
    }

    async submitConversionRequest(consultantId: string, leadId: string, data: ConversionRequestData) {
        const lead = await this.repo.findLeadById(leadId, consultantId);
        if (!lead) throw new HttpException(404, 'Lead not found');

        const existingRequest = await this.repo.findConversionRequestByLead(leadId);
        if (existingRequest) throw new HttpException(409, 'Conversion request already pending');

        return this.repo.createConversionRequest({
            lead: { connect: { id: leadId } },
            consultant: { connect: { id: consultantId } },
            region: { connect: { id: lead.region_id || 'default-region' } }, // Fallback logic needed in real app
            status: 'PENDING',
            company_name: data.companyName || lead.company_name,
            email: data.email || lead.email,
            phone: data.phone || lead.phone,
            agent_notes: data.agentNotes,
            country: lead.country,
            city: lead.city,
            state_province: lead.state_province,
            website: lead.website
        });
    }

    // Financials (Reusing consultant logic but exposed via new endpoints as per Plan)
    async getUnifiedEarnings(consultantId: string) {
        return this.consultantRepository.findCommissionStats(consultantId);
    }

    async getUnifiedBalance(consultantId: string) {
        // Logic same as consultant service
        const stats = await this.consultantRepository.findCommissionStats(consultantId);

        const availableCommissions = await this.consultantRepository.findAvailableCommissionsForWithdrawal(consultantId);
        const availableBalance = availableCommissions.reduce((sum, c) => sum + c.amount, 0);

        const withdrawals = await this.consultantRepository.findWithdrawals(consultantId);
        const totalWithdrawn = withdrawals
            .filter(w => w.status === 'COMPLETED')
            .reduce((sum, w) => sum + w.amount, 0);

        return {
            available: Math.round(availableBalance * 100) / 100,
            pending: Math.round(stats.pending * 100) / 100,
            totalEarned: Math.round(stats.totalEarned * 100) / 100,
            totalWithdrawn: Math.round(totalWithdrawn * 100) / 100
        };
    }
}

export const consultant360Service = new Consultant360Service(new Consultant360Repository());
