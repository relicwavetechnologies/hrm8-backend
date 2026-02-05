import { BaseService } from '../../core/service';
import { LeadConversionRepository } from './lead-conversion.repository';
import { SalesRepository } from './sales.repository';
import { AuthService } from '../auth/auth.service';
import { CompanyService } from '../company/company.service';
import { NotificationService } from '../notification/notification.service';
import { ConversionRequestStatus, UniversalNotificationType, NotificationRecipientType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class LeadConversionService extends BaseService {
    constructor(
        private leadConversionRepository: LeadConversionRepository,
        private salesRepository: SalesRepository,
        private authService: AuthService,
        private companyService: CompanyService,
        private notificationService: NotificationService
    ) {
        super();
    }

    async submitRequest(leadId: string, consultantId: string, data: { agentNotes?: string }) {
        const lead = await this.salesRepository.findLeadById(leadId);
        if (!lead) throw new HttpException(404, 'Lead not found');
        if (lead.assigned_consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
        if (lead.status === 'CONVERTED') throw new HttpException(400, 'Lead already converted');

        // Check for pending requests
        const pendingCount = await this.leadConversionRepository.countByLeadAndStatus(leadId, ['PENDING']);
        if (pendingCount > 0) throw new HttpException(400, 'A pending request already exists');

        // Check attempt limit (2)
        const totalAttempts = await this.leadConversionRepository.countByLeadAndStatus(leadId, ['PENDING', 'APPROVED', 'DECLINED', 'CONVERTED']);
        if (totalAttempts >= 2) throw new HttpException(400, 'Maximum 2 conversion attempts allowed');

        if (!lead.region_id) throw new HttpException(400, 'Lead must be assigned to a region before conversion');

        const request = await this.leadConversionRepository.create({
            lead: { connect: { id: leadId } },
            consultant: { connect: { id: consultantId } },
            region: { connect: { id: lead.region_id } },
            company_name: lead.company_name,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            country: lead.country,
            agent_notes: data.agentNotes,
            status: 'PENDING'
        });

        // Notify Regional Admins
        if (lead.region_id) {
            // Ideally we find admins for this region and notify them
            // For now, let's assume we notify based on role if we have a way to find them
        }

        return request;
    }

    async getMyRequests(consultantId: string) {
        return this.leadConversionRepository.findAll({ consultant_id: consultantId });
    }

    async getAllRequests(filters: { status?: ConversionRequestStatus; regionIds?: string[] }) {
        return this.leadConversionRepository.findAll({
            status: filters.status,
            region_ids: filters.regionIds
        });
    }

    async approveRequest(requestId: string, adminId: string, adminNotes?: string) {
        const request = await this.leadConversionRepository.findById(requestId);
        if (!request) throw new HttpException(404, 'Request not found');
        if (request.status !== 'PENDING') throw new HttpException(400, `Request is already ${request.status}`);

        // Update status to APPROVED first
        await this.leadConversionRepository.update(requestId, {
            status: 'APPROVED',
            reviewer: { connect: { id: adminId } },
            reviewed_at: new Date(),
            admin_notes: adminNotes
        });

        try {
            // Create company and employer - using a generic temp password as per legacy logic
            const tempPassword = 'vAbhi2678';

            const company = await this.companyService.createCompany({
                name: request.company_name,
                domain: request.website ? request.website.replace(/^https?:\/\//, '').split('/')[0] : request.email.split('@')[1],
                website: request.website || `https://${request.email.split('@')[1]}`,
                countryOrRegion: request.country,
                regionId: request.region_id,
                salesAgentId: request.consultant_id,
                verificationStatus: 'VERIFIED'
            });

            await this.authService.registerCompanyAdmin(
                company.id,
                request.email,
                'Company Admin', // Placeholder name
                tempPassword,
                true // Activate immediately
            );

            // Mark request as CONVERTED
            const updatedRequest = await this.leadConversionRepository.update(requestId, {
                status: 'CONVERTED',
                converted_at: new Date(),
                company: { connect: { id: company.id } }
            });

            // Update Lead status
            await this.salesRepository.updateLead(request.lead_id, {
                status: 'CONVERTED',
                company: { connect: { id: company.id } },
                converted_at: new Date()
            });

            // Notify Consultant
            await this.notificationService.createNotification({
                recipientType: 'CONSULTANT',
                recipientId: request.consultant_id,
                type: UniversalNotificationType.LEAD_CONVERTED,
                title: 'Lead Converted!',
                message: `Great job! Your lead ${request.company_name} has been converted.`,
                actionUrl: `/consultant/leads`
            });

            return { request: updatedRequest, company, tempPassword };

        } catch (error: any) {
            // Rollback to PENDING if failed
            await this.leadConversionRepository.update(requestId, {
                status: 'PENDING',
                reviewer: { disconnect: true },
                reviewed_at: null,
                admin_notes: null
            });
            throw new HttpException(500, `Conversion failed: ${error.message}`);
        }
    }

    async declineRequest(requestId: string, adminId: string, reason: string) {
        const request = await this.leadConversionRepository.findById(requestId);
        if (!request) throw new HttpException(404, 'Request not found');
        if (request.status !== 'PENDING') throw new HttpException(400, 'Can only decline pending requests');

        const updatedRequest = await this.leadConversionRepository.update(requestId, {
            status: 'DECLINED',
            reviewer: { connect: { id: adminId } },
            reviewed_at: new Date(),
            decline_reason: reason
        });

        // Notify Consultant
        await this.notificationService.createNotification({
            recipientType: 'CONSULTANT',
            recipientId: request.consultant_id,
            type: UniversalNotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Conversion Request Declined',
            message: `Your request for ${request.company_name} was declined. Reason: ${reason}`,
            actionUrl: `/consultant/leads`
        });

        return updatedRequest;
    }

    async cancelRequest(requestId: string, consultantId: string) {
        const request = await this.leadConversionRepository.findById(requestId);
        if (!request) throw new HttpException(404, 'Request not found');
        if (request.consultant_id !== consultantId) throw new HttpException(403, 'Unauthorized');
        if (request.status !== 'PENDING') throw new HttpException(400, 'Can only cancel pending requests');

        return this.leadConversionRepository.update(requestId, { status: 'CANCELLED' });
    }
}
