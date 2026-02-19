"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const currency_assignment_service_1 = require("../pricing/currency-assignment.service");
class CompanyService extends service_1.BaseService {
    constructor(companyRepository) {
        super();
        this.companyRepository = companyRepository;
    }
    async createCompany(data) {
        const domain = data.domain.toLowerCase();
        // Check if domain exists
        const exists = await this.companyRepository.countByDomain(domain);
        if (exists > 0) {
            throw new http_exception_1.HttpException(409, `Company with domain "${domain}" already exists.`);
        }
        // Create company
        const company = await this.companyRepository.create({
            name: data.name,
            domain: domain,
            website: data.website,
            country_or_region: data.countryOrRegion,
            accepted_terms: data.acceptedTerms,
            verification_status: data.verificationStatus || 'PENDING',
            verification_method: data.verificationMethod,
            verified_at: data.verificationData?.verifiedAt,
            verified_by: data.verificationData?.verifiedBy,
            gst_number: data.verificationData?.gstNumber,
            registration_number: data.verificationData?.registrationNumber,
            linked_in_url: data.verificationData?.linkedInUrl,
            region: data.regionId ? { connect: { id: data.regionId } } : undefined,
            sales_agent: data.salesAgentId ? { connect: { id: data.salesAgentId } } : undefined,
        });
        // Assign pricing peg and billing currency from country code or region
        let countryCode = data.countryCode;
        if (!countryCode && (data.regionId || data.countryOrRegion)) {
            countryCode = (await currency_assignment_service_1.CurrencyAssignmentService.resolveCountryCode(data.countryOrRegion, data.regionId)) ?? undefined;
        }
        if (countryCode) {
            try {
                await currency_assignment_service_1.CurrencyAssignmentService.assignCurrencyToCompany(company.id, countryCode);
            }
            catch (error) {
                console.warn(`Failed to assign currency to company ${company.id}:`, error);
                // Continue - company will default to USD
            }
        }
        return company;
    }
    async updateCompany(id, data) {
        const company = await this.companyRepository.findById(id);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return this.companyRepository.update(id, data);
    }
    async getCompany(id) {
        const company = await this.companyRepository.findById(id);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return company;
    }
    async getCompanyByDomain(domain) {
        return this.companyRepository.findByDomain(domain);
    }
    // --- Profile ---
    async getProfile(companyId) {
        const profile = await this.companyRepository.findProfileByCompanyId(companyId);
        if (!profile) {
            // Auto-create empty profile if not exists
            return this.companyRepository.createProfile({
                company: { connect: { id: companyId } },
                status: 'NOT_STARTED',
                profile_data: { teamMembers: { invites: [] }, additionalLocations: [] },
            });
        }
        return profile;
    }
    async updateProfile(companyId, data) {
        return this.companyRepository.upsertProfile(companyId, {
            company: { connect: { id: companyId } },
            ...data
        }, data);
    }
    // --- Verification ---
    async updateVerificationStatus(id, status, method) {
        const updateData = { verification_status: status };
        if (method)
            updateData.verification_method = method;
        if (status === 'VERIFIED')
            updateData.verified_at = new Date();
        return this.companyRepository.update(id, updateData);
    }
    // --- Settings ---
    async getJobAssignmentSettings(id) {
        const company = await this.companyRepository.findById(id);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return {
            jobAssignmentMode: company.job_assignment_mode,
            preferredRecruiterId: company.preferred_recruiter_id,
        };
    }
    async updateJobAssignmentMode(id, mode) {
        return this.companyRepository.update(id, { job_assignment_mode: mode });
    }
    // --- Transactions ---
    async getTransactions(companyId, limit, offset) {
        const company = await this.companyRepository.findById(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return this.companyRepository.findTransactions(companyId, limit, offset);
    }
    async getTransactionStats(companyId) {
        const company = await this.companyRepository.findById(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return this.companyRepository.getTransactionStats(companyId);
    }
    // --- Refund Requests ---
    async createRefundRequest(companyId, data) {
        const company = await this.companyRepository.findById(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        if (!data.amount || data.amount <= 0) {
            throw new http_exception_1.HttpException(400, 'Amount must be greater than 0');
        }
        if (!data.reason) {
            throw new http_exception_1.HttpException(400, 'Reason is required');
        }
        return this.companyRepository.createRefundRequest({
            company: { connect: { id: companyId } },
            amount: data.amount,
            reason: data.reason,
            description: data.description,
            invoice_number: data.invoiceNumber,
            status: 'PENDING'
        });
    }
    async getRefundRequests(companyId, limit, offset) {
        const company = await this.companyRepository.findById(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return this.companyRepository.findRefundRequests({ company_id: companyId }, limit, offset);
    }
    async cancelRefundRequest(requestId, companyId) {
        const request = await this.companyRepository.findRefundRequestById(requestId);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Refund request not found');
        if (request.company_id !== companyId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        }
        if (request.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, `Cannot cancel a ${request.status} refund request`);
        }
        return this.companyRepository.deleteRefundRequest(requestId);
    }
    async withdrawRefundRequest(requestId, companyId) {
        const request = await this.companyRepository.findRefundRequestById(requestId);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Refund request not found');
        if (request.company_id !== companyId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        }
        if (request.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, `Cannot withdraw a ${request.status} refund request`);
        }
        return this.companyRepository.updateRefundRequest(requestId, {
            status: 'WITHDRAWN',
            withdrawn_at: new Date()
        });
    }
}
exports.CompanyService = CompanyService;
