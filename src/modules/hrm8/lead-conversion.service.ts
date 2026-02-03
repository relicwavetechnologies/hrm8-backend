import { BaseService } from '../../core/service';
import { LeadConversionRepository } from './lead-conversion.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { ConversionRequestStatus, LeadStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';

export class LeadConversionService extends BaseService {
    constructor(private leadConversionRepository: LeadConversionRepository) {
        super();
    }

    async getAll(filters: { status?: ConversionRequestStatus; regionIds?: string[] }) {
        const where: any = {};
        if (filters.status) where.status = filters.status;
        if (filters.regionIds) where.region_id = { in: filters.regionIds };

        return this.leadConversionRepository.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }

    async getOne(id: string) {
        const request = await this.leadConversionRepository.findUnique(id);
        if (!request) throw new HttpException(404, 'Conversion request not found');
        return request;
    }

    async approve(id: string, adminId: string, adminNotes?: string) {
        const request = await this.getOne(id);
        if (request.status !== 'PENDING') {
            throw new HttpException(400, `Request cannot be approved in ${request.status} status`);
        }

        // Logic to convert lead to company
        // 1. Create company
        // 2. Create employer user
        // 3. Update lead status
        // 4. Update request status

        return prisma.$transaction(async (tx) => {
            const tempPassword = request.temp_password || 'vAbhi2678';
            // const passwordHash = await hashPassword(tempPassword); // If needed for creating user

            const domain = request.website ? request.website.replace(/^https?:\/\//, '').split('/')[0] : `company-${request.id}.local`;

            // Create Company
            const company = await tx.company.create({
                data: {
                    name: request.company_name,
                    domain,
                    website: request.website || '',
                    region_id: request.region_id,
                    country_or_region: request.country,
                },
            });

            // Update Lead
            await tx.lead.update({
                where: { id: request.lead_id },
                data: { status: 'CONVERTED' },
            });

            // Update Request
            const updatedRequest = await tx.leadConversionRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    reviewed_by: adminId,
                    reviewed_at: new Date(),
                    admin_notes: adminNotes,
                    company_id: company.id,
                    converted_at: new Date(),
                },
            });

            return { request: updatedRequest, company, tempPassword };
        });
    }

    async decline(id: string, adminId: string, declineReason: string) {
        const request = await this.getOne(id);
        if (request.status !== 'PENDING') {
            throw new HttpException(400, `Request cannot be declined in ${request.status} status`);
        }

        return this.leadConversionRepository.update(id, {
            status: 'DECLINED',
            reviewer: { connect: { id: adminId } },
            reviewed_at: new Date(),
            decline_reason: declineReason,
        });
    }
}
