import { Lead, LeadConversionRequest, LeadStatus, ConversionRequestStatus, Commission } from '@prisma/client';

export interface CreateLeadRequest {
    companyName: string;
    email: string;
    phone?: string;
    website?: string;
    country: string;
    city?: string;
    state?: string;
    notes?: string;
}

export interface ConversionRequestData {
    companyName?: string; // Optional override
    email?: string;
    phone?: string;
    agentNotes?: string;
}

export interface LeadFilters {
    status?: LeadStatus;
    search?: string;
    page?: number;
    limit?: number;
}

export interface DashboardStats {
    totalLeads: number;
    activeLeads: number;
    convertedLeads: number;
    totalEarnings: number;
    pendingEarnings: number;
    conversionRate: number;
}
