"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadConversionService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
const password_1 = require("../../utils/password");
const user_repository_1 = require("../user/user.repository");
const password_reset_service_1 = require("../auth/password-reset.service");
const audit_log_service_1 = require("./audit-log.service");
const audit_log_repository_1 = require("./audit-log.repository");
const currency_assignment_service_1 = require("../pricing/currency-assignment.service");
class LeadConversionService extends service_1.BaseService {
    constructor(leadConversionRepository) {
        super();
        this.leadConversionRepository = leadConversionRepository;
        this.userRepository = new user_repository_1.UserRepository();
        this.auditLogService = new audit_log_service_1.AuditLogService(new audit_log_repository_1.AuditLogRepository());
    }
    async getAll(filters) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.regionIds)
            where.region_id = { in: filters.regionIds };
        return this.leadConversionRepository.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }
    async getOne(id) {
        const request = await this.leadConversionRepository.findUnique(id);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Conversion request not found');
        return request;
    }
    async approve(id, admin, adminNotes, metadata) {
        const request = await this.getOne(id);
        if (request.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, `Request cannot be approved in ${request.status} status`);
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
        const { updatedRequest, company, userId } = await prisma_1.prisma.$transaction(async (tx) => {
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
                const passwordHash = await (0, password_1.hashPassword)(tempPassword);
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
            const countryCode = await currency_assignment_service_1.CurrencyAssignmentService.resolveCountryCode(request.country, request.region_id);
            if (countryCode) {
                await currency_assignment_service_1.CurrencyAssignmentService.assignCurrencyToCompany(company.id, countryCode);
            }
        }
        catch (err) {
            console.warn(`[LeadConversion] Could not assign currency for company ${company.id}:`, err);
        }
        if (request.email) {
            await password_reset_service_1.passwordResetService.requestLeadConversionInvite(request.email, company.name, {
                ip: metadata?.ip,
                userAgent: metadata?.userAgent,
            });
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
    async decline(id, admin, declineReason, metadata) {
        const request = await this.getOne(id);
        if (request.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, `Request cannot be declined in ${request.status} status`);
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
exports.LeadConversionService = LeadConversionService;
