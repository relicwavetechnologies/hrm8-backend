import { BaseService } from '../../core/service';
import { LeadConversionRepository } from './lead-conversion.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { ConversionRequestStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import { UserRepository } from '../user/user.repository';
import { passwordResetService } from '../auth/password-reset.service';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { CurrencyAssignmentService } from '../pricing/currency-assignment.service';

export class LeadConversionService extends BaseService {
    private userRepository: UserRepository;
    private auditLogService: AuditLogService;

    constructor(private leadConversionRepository: LeadConversionRepository) {
        super();
        this.userRepository = new UserRepository();
        this.auditLogService = new AuditLogService(new AuditLogRepository());
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

    async approve(
        id: string,
        admin: { id: string; email: string; role: string },
        adminNotes?: string,
        metadata?: { ip?: string; userAgent?: string }
    ) {
        const request = await this.getOne(id);
        if (request.status !== 'PENDING') {
            throw new HttpException(400, `Request cannot be approved in ${request.status} status`);
        }

        // Logic to convert lead to company
        // 1. Create company
        // 2. Create employer user
        // 3. Update lead status
        // 4. Update request status

        const tempPassword = request.temp_password || 'vAbhi2678';
        // Ensure unique domain: extract from website if present, append lead_id to avoid collisions
        const baseDomain = request.website
            ? request.website.replace(/^https?:\/\//, '').split('/')[0].replace(/\./g, '-')
            : 'company';
        const domain = `${baseDomain}-${request.lead_id}.local`;

        const { updatedRequest, company, userId } = await prisma.$transaction(async (tx) => {
            // const passwordHash = await hashPassword(tempPassword); // If needed for creating user

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
                    status: 'APPROVED',
                    reviewed_by: admin.id,
                    reviewed_at: new Date(),
                    admin_notes: adminNotes,
                    company_id: company.id,
                    converted_at: new Date(),
                },
            });

            // Create company admin user if not exists
            const existingUser = await this.userRepository.findByEmail(request.email);
            let userId = existingUser?.id;
            if (!existingUser) {
                const passwordHash = await hashPassword(tempPassword);
                const newUser = await tx.user.create({
                    data: {
                        email: request.email,
                        name: `${request.company_name} Admin`,
                        password_hash: passwordHash,
                        company_id: company.id,
                        role: 'ADMIN',
                        status: 'ACTIVE', // Allow immediate login with temp password
                    },
                });
                userId = newUser.id;
            }
            return { updatedRequest, company, userId };
        });

        // Assign pricing peg and billing currency from region/country
        try {
            const countryCode = await CurrencyAssignmentService.resolveCountryCode(
                request.country,
                request.region_id
            );
            if (countryCode) {
                await CurrencyAssignmentService.assignCurrencyToCompany(company.id, countryCode);
            }
        } catch (err) {
            console.warn(`[LeadConversion] Could not assign currency for company ${company.id}:`, err);
        }

        if (request.email) {
            await passwordResetService.requestLeadConversionInvite(
                request.email,
                company.name,
                {
                    ip: metadata?.ip,
                    userAgent: metadata?.userAgent,
                }
            );
        }

        await this.auditLogService.log({
            entityType: 'lead_conversion_request',
            entityId: updatedRequest.id,
            action: 'LEAD_CONVERSION_APPROVED',
            performedBy: admin.id,
            performedByEmail: admin.email,
            performedByRole: admin.role,
            changes: {
                leadId: request.lead_id,
                companyId: company.id,
                userId,
            },
            ipAddress: metadata?.ip,
            userAgent: metadata?.userAgent,
            description: `Approved lead conversion for ${request.company_name}`,
        });

        return { request: updatedRequest, company, inviteSent: Boolean(request.email) };
    }

    async decline(
        id: string,
        admin: { id: string; email: string; role: string },
        declineReason: string,
        metadata?: { ip?: string; userAgent?: string }
    ) {
        const request = await this.getOne(id);
        if (request.status !== 'PENDING') {
            throw new HttpException(400, `Request cannot be declined in ${request.status} status`);
        }

        const updated = await this.leadConversionRepository.update(id, {
            status: 'DECLINED',
            reviewer: { connect: { id: admin.id } },
            reviewed_at: new Date(),
            decline_reason: declineReason,
        });

        await this.auditLogService.log({
            entityType: 'lead_conversion_request',
            entityId: updated.id,
            action: 'LEAD_CONVERSION_DECLINED',
            performedBy: admin.id,
            performedByEmail: admin.email,
            performedByRole: admin.role,
            changes: {
                leadId: updated.lead_id,
                declineReason,
            },
            ipAddress: metadata?.ip,
            userAgent: metadata?.userAgent,
            description: `Declined lead conversion for ${updated.company_name}`,
        });

        return updated;
    }
}
