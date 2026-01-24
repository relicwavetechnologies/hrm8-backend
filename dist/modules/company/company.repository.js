"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRepository = exports.CompanyRepository = exports.CompanyAlreadyExistsError = void 0;
const repository_1 = require("../../core/repository");
const types_1 = require("../../types");
const client_1 = require("@prisma/client");
class CompanyAlreadyExistsError extends Error {
    constructor(domain) {
        super(`A company with the domain "${domain}" already exists.`);
        this.name = 'CompanyAlreadyExistsError';
    }
}
exports.CompanyAlreadyExistsError = CompanyAlreadyExistsError;
class CompanyRepository extends repository_1.BaseRepository {
    async create(companyData) {
        try {
            const company = await this.prisma.company.create({
                data: {
                    name: companyData.name,
                    website: companyData.website,
                    domain: companyData.domain,
                    country_or_region: companyData.countryOrRegion,
                    accepted_terms: companyData.acceptedTerms,
                    verification_status: companyData.verificationStatus,
                    verification_method: companyData.verificationMethod,
                    verified_at: companyData.verificationData?.verifiedAt,
                    verified_by: companyData.verificationData?.verifiedBy,
                    gst_number: companyData.verificationData?.gstNumber,
                    registration_number: companyData.verificationData?.registrationNumber,
                    linked_in_url: companyData.verificationData?.linkedInUrl,
                    region_id: companyData.regionId,
                    referred_by: companyData.referredBy,
                    sales_agent_id: companyData.salesAgentId,
                },
            });
            return this.mapPrismaToCompany(company);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002' &&
                error.meta?.target &&
                Array.isArray(error.meta.target) &&
                error.meta.target.includes('domain')) {
                throw new CompanyAlreadyExistsError(companyData.domain);
            }
            throw error;
        }
    }
    async findById(id) {
        const company = await this.prisma.company.findUnique({
            where: { id },
        });
        return company ? this.mapPrismaToCompany(company) : null;
    }
    async findByDomain(domain) {
        const normalizedDomain = domain.toLowerCase().trim();
        let company = await this.prisma.company.findUnique({
            where: { domain: normalizedDomain },
        });
        if (company) {
            return this.mapPrismaToCompany(company);
        }
        const domainParts = normalizedDomain.split('.');
        if (domainParts.length > 2) {
            const baseDomain = domainParts.slice(-2).join('.');
            company = await this.prisma.company.findUnique({
                where: { domain: baseDomain },
            });
            if (company) {
                return this.mapPrismaToCompany(company);
            }
        }
        return null;
    }
    async updateVerificationStatus(id, status, method) {
        const updateData = {
            verification_status: status,
        };
        if (method) {
            updateData.verification_method = method;
        }
        if (status === types_1.CompanyVerificationStatus.VERIFIED) {
            updateData.verified_at = new Date();
        }
        const company = await this.prisma.company.update({
            where: { id },
            data: updateData,
        });
        return this.mapPrismaToCompany(company);
    }
    async updateVerificationData(id, verificationData) {
        const company = await this.prisma.company.update({
            where: { id },
            data: {
                gst_number: verificationData.gstNumber,
                registration_number: verificationData.registrationNumber,
                linked_in_url: verificationData.linkedInUrl,
                verified_by: verificationData.verifiedBy,
            },
        });
        return this.mapPrismaToCompany(company);
    }
    async findAll(limit = 100, offset = 0) {
        const companies = await this.prisma.company.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
        });
        return companies.map((company) => this.mapPrismaToCompany(company));
    }
    async updateJobAssignmentMode(companyId, mode) {
        const company = await this.prisma.company.update({
            where: { id: companyId },
            data: { job_assignment_mode: mode },
        });
        return this.mapPrismaToCompany(company);
    }
    async getJobAssignmentSettings(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                job_assignment_mode: true,
                preferred_recruiter_id: true,
            },
        });
        if (!company) {
            return null;
        }
        return {
            jobAssignmentMode: company.job_assignment_mode,
            preferredRecruiterId: company.preferred_recruiter_id,
        };
    }
    mapPrismaToCompany(prismaCompany) {
        return {
            id: prismaCompany.id,
            name: prismaCompany.name,
            website: prismaCompany.website,
            domain: prismaCompany.domain,
            countryOrRegion: prismaCompany.country_or_region,
            acceptedTerms: prismaCompany.accepted_terms,
            verificationStatus: prismaCompany.verification_status,
            verificationMethod: prismaCompany.verification_method || undefined,
            verificationData: {
                verifiedAt: prismaCompany.verified_at || undefined,
                verifiedBy: prismaCompany.verified_by || undefined,
                gstNumber: prismaCompany.gst_number || undefined,
                registrationNumber: prismaCompany.registration_number || undefined,
                linkedInUrl: prismaCompany.linked_in_url || undefined,
            },
            regionId: prismaCompany.region_id || undefined,
            jobAssignmentMode: prismaCompany.job_assignment_mode || undefined,
            preferredRecruiterId: prismaCompany.preferred_recruiter_id || undefined,
            regionOwnerType: prismaCompany.region_owner_type || undefined,
            commissionStatus: prismaCompany.commission_status || undefined,
            attributionLocked: prismaCompany.attribution_locked,
            attributionLockedAt: prismaCompany.attribution_locked_at || undefined,
            referredBy: prismaCompany.referred_by || undefined,
            salesAgentId: prismaCompany.sales_agent_id || undefined,
            createdAt: prismaCompany.created_at,
            updatedAt: prismaCompany.updated_at,
        };
    }
}
exports.CompanyRepository = CompanyRepository;
exports.companyRepository = new CompanyRepository();
