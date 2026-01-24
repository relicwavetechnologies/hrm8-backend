"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyService = exports.CompanyService = void 0;
const service_1 = require("../../core/service");
const types_1 = require("../../types");
const company_repository_1 = require("./company.repository");
const company_profile_service_1 = require("./company-profile.service"); // Circular dep? No, Service uses Service.
const verification_service_1 = require("../verification/verification.service");
const domain_1 = require("../../utils/domain");
class CompanyService extends service_1.BaseService {
    constructor(repository = company_repository_1.companyRepository, 
    // Delay injection or use a getter if circular dependency becomes an issue.
    // However, here CompanyService uses CompanyProfileService (to init profile),
    // and CompanyProfileService might use CompanyService? Let's check.
    // CompanyProfileService uses InvitationService. It doesn't seem to use CompanyService directly in logic shown.
    profileService = company_profile_service_1.companyProfileService, verificationServiceRef = verification_service_1.verificationService) {
        super();
        this.repository = repository;
        this.profileService = profileService;
        this.verificationServiceRef = verificationServiceRef;
    }
    async registerCompany(registrationData, options) {
        const domain = (0, domain_1.extractDomain)(registrationData.companyWebsite);
        const adminEmailDomain = (0, domain_1.extractEmailDomain)(registrationData.adminEmail);
        const domainsMatch = (0, domain_1.doDomainsBelongToSameOrg)(domain, adminEmailDomain);
        if (!domainsMatch && !options?.skipDomainValidation) {
            throw new Error('Admin email domain must match your company website domain. Please use your corporate email address.');
        }
        const company = await this.repository.create({
            name: registrationData.companyName,
            website: registrationData.companyWebsite,
            domain: domain,
            countryOrRegion: registrationData.countryOrRegion.trim(),
            acceptedTerms: registrationData.acceptTerms,
            verificationStatus: options?.skipEmailVerification
                ? types_1.CompanyVerificationStatus.VERIFIED
                : types_1.CompanyVerificationStatus.PENDING,
            regionId: options?.regionId,
            salesAgentId: options?.salesAgentId,
        });
        await this.profileService.initializeProfile(company.id);
        if (!options?.skipEmailVerification) {
            await this.verificationServiceRef.initiateEmailVerification(company, registrationData.adminEmail);
        }
        return {
            company,
            verificationMethod: options?.skipEmailVerification
                ? types_1.VerificationMethod.MANUAL_VERIFICATION
                : types_1.VerificationMethod.VERIFICATION_EMAIL,
            verificationRequired: !options?.skipEmailVerification,
        };
    }
    async findByDomain(domain) {
        return await this.repository.findByDomain(domain);
    }
    async findById(id) {
        return await this.repository.findById(id);
    }
    async getVerificationStatus(companyId) {
        const company = await this.repository.findById(companyId);
        return company?.verificationStatus || null;
    }
}
exports.CompanyService = CompanyService;
exports.companyService = new CompanyService();
