import { BaseService } from '../../core/service';
import { LeadConversionRepository } from './lead-conversion.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { ConversionRequestStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { generateVerificationToken, generateToken } from '../../utils/token';
import { emailService } from '../email/email.service';

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

        const normalizedEmail = normalizeEmail(request.email);
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            throw new HttpException(400, 'A user with this email already exists');
        }

        return prisma.$transaction(async (tx) => {
            const tempPassword = request.temp_password || generateToken(8);
            const passwordHash = await hashPassword(tempPassword);

            const domain = request.website
                ? request.website.replace(/^https?:\/\//, '').split('/')[0]
                : `company-${request.id}.local`;

            // Create Company
            const company = await tx.company.create({
                data: {
                    name: request.company_name,
                    domain,
                    website: request.website || '',
                    region_id: request.region_id,
                    country_or_region: request.country,
                    verification_status: 'PENDING',
                },
            });

            // Create Company Admin User
            const user = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    name: `${request.company_name} Admin`,
                    password_hash: passwordHash,
                    role: 'ADMIN',
                    status: 'INVITED',
                    company: { connect: { id: company.id } },
                },
            });

            // Create Verification Token
            const verificationToken = generateVerificationToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            await tx.verificationToken.create({
                data: {
                    company: { connect: { id: company.id } },
                    email: user.email,
                    token: verificationToken,
                    expires_at: expiresAt,
                },
            });

            // Update Lead
            await tx.lead.update({
                where: { id: request.lead_id },
                data: {
                    status: 'CONVERTED',
                    converted_to_company_id: company.id,
                    converted_at: new Date(),
                },
            });

            // Update Request
            const updatedRequest = await tx.leadConversionRequest.update({
                where: { id },
                data: {
                    status: 'CONVERTED',
                    reviewed_by: adminId,
                    reviewed_at: new Date(),
                    admin_notes: adminNotes,
                    company_id: company.id,
                    converted_at: new Date(),
                },
            });

            return { request: updatedRequest, company, tempPassword, verificationToken };
        }).then(async (result) => {
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            const invitationUrl = `${baseUrl}/verify-company?token=${result.verificationToken}&companyId=${result.company.id}`;

            await emailService.sendInvitationEmail({
                to: normalizeEmail(request.email),
                companyName: result.company.name,
                invitationUrl,
            });

            return {
                request: result.request,
                company: result.company,
                tempPassword: result.tempPassword,
            };
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
