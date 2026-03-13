"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicService = void 0;
const service_1 = require("../../core/service");
const prisma_1 = require("../../utils/prisma");
const jobtarget_service_1 = require("../jobtarget/jobtarget.service");
class PublicService extends service_1.BaseService {
    constructor(jobRepository, companyRepository) {
        super();
        this.jobRepository = jobRepository;
        this.companyRepository = companyRepository;
    }
    normalizeSocial(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        const obj = value;
        const normalized = {};
        for (const [key, raw] of Object.entries(obj)) {
            if (typeof raw === 'string' && raw.trim()) {
                normalized[key] = raw.trim();
            }
        }
        return Object.keys(normalized).length > 0 ? normalized : null;
    }
    normalizeImages(value) {
        if (!Array.isArray(value))
            return null;
        const images = value.filter((v) => typeof v === 'string' && v.trim().length > 0);
        return images.length > 0 ? images : null;
    }
    toPublicCompany(company, jobCount) {
        return {
            id: company.id,
            name: company.name,
            website: company.website,
            domain: company.domain,
            logoUrl: company.careers_page_logo,
            bannerUrl: company.careers_page_banner,
            about: company.careers_page_about,
            social: this.normalizeSocial(company.careers_page_social),
            images: this.normalizeImages(company.careers_page_images),
            jobCount,
        };
    }
    toPublicJob(job) {
        return {
            id: job.id,
            title: job.title,
            description: job.description,
            jobSummary: job.job_summary,
            category: job.category,
            location: job.location,
            department: job.department,
            workArrangement: job.work_arrangement,
            employmentType: job.employment_type,
            numberOfVacancies: job.number_of_vacancies,
            salaryMin: job.salary_min,
            salaryMax: job.salary_max,
            salaryCurrency: job.salary_currency,
            salaryDescription: job.salary_description,
            requirements: Array.isArray(job.requirements) ? job.requirements : [],
            responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
            promotionalTags: Array.isArray(job.promotional_tags) ? job.promotional_tags : [],
            featured: !!job.featured,
            postingDate: job.posting_date,
            expiryDate: job.expires_at,
            regionId: job.region_id,
            company: {
                id: job.company?.id,
                name: job.company?.name || 'Unknown Company',
                website: job.company?.website || '',
                domain: job.company?.domain,
                logoUrl: job.company?.careers_page_logo,
                aboutCompany: job.company?.careers_page_about,
            },
            createdAt: job.created_at,
        };
    }
    async getPublicJobs(filters) {
        const { limit, offset, ...queryFilters } = filters;
        // Transform filters to Prisma where clause format
        const where = {};
        if (queryFilters.search) {
            where.OR = [
                { title: { contains: queryFilters.search, mode: 'insensitive' } },
                { description: { contains: queryFilters.search, mode: 'insensitive' } }
            ];
        }
        // Add other filter mappings as needed...
        return this.jobRepository.findPublicJobs(where, limit, offset);
    }
    async getPublicJob(id, opts) {
        const job = await this.jobRepository.findById(id);
        if (!job || job.status !== 'OPEN') {
            return null;
        }
        // If job is private, verify the candidate has a valid invitation
        if (job.visibility !== 'public') {
            let hasAccess = false;
            if (opts?.invitationToken) {
                const invitation = await prisma_1.prisma.jobInvitation.findFirst({
                    where: {
                        job_id: id,
                        token: opts.invitationToken,
                        status: { in: ['PENDING', 'ACCEPTED'] },
                    },
                });
                hasAccess = !!invitation;
            }
            if (!hasAccess && opts?.candidateEmail) {
                const invitation = await prisma_1.prisma.jobInvitation.findFirst({
                    where: {
                        job_id: id,
                        email: { equals: opts.candidateEmail, mode: 'insensitive' },
                        status: { in: ['PENDING', 'ACCEPTED'] },
                    },
                });
                hasAccess = !!invitation;
            }
            if (!hasAccess) {
                return null;
            }
        }
        // Check expiry
        if (job.expires_at && new Date() > job.expires_at) {
            return null;
        }
        const company = await this.companyRepository.findById(job.company_id);
        return {
            ...this.toPublicJob({
                ...job,
                company: company ? {
                    id: company.id,
                    name: company.name,
                    website: company.website,
                    domain: company.domain,
                    careers_page_logo: company.careers_page_logo,
                    careers_page_about: company.careers_page_about,
                } : null,
            }),
            // Keep raw fields for backward compatibility with older consumers.
            ...job,
            company: company ? {
                id: company.id,
                name: company.name,
                website: company.website,
                domain: company.domain,
                logoUrl: company.careers_page_logo,
                aboutCompany: company.careers_page_about,
            } : { name: 'Unknown Company' }
        };
    }
    async getPublicCompanies(filters) {
        const result = await this.companyRepository.findPublicCompanies({
            search: filters.search,
            limit: filters.limit,
            offset: filters.offset,
        });
        const companyIds = result.companies.map((company) => company.id);
        const countsByCompanyId = await this.jobRepository.getPublicJobCountsByCompanyIds(companyIds);
        return {
            companies: result.companies.map((company) => this.toPublicCompany(company, countsByCompanyId[company.id] || 0)),
            total: result.total,
        };
    }
    async getPublicCompany(id, filters) {
        const company = await this.companyRepository.findPublicCompanyById(id);
        if (!company)
            return null;
        const where = { company_id: id };
        if (filters.department?.trim()) {
            where.department = filters.department.trim();
        }
        if (filters.location?.trim()) {
            where.location = filters.location.trim();
        }
        if (filters.search?.trim()) {
            const search = filters.search.trim();
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { job_summary: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [jobsResult, facets, countByCompany] = await Promise.all([
            this.jobRepository.findPublicJobs(where, filters.limit, filters.offset),
            this.jobRepository.getPublicCompanyJobFacets(id),
            this.jobRepository.getPublicJobCountsByCompanyIds([id]),
        ]);
        return {
            company: this.toPublicCompany(company, countByCompany[id] || 0),
            jobs: jobsResult.jobs.map((job) => this.toPublicJob(job)),
            totalJobs: jobsResult.total,
            filters: facets,
        };
    }
    async getPublicCompanyJobs(id, filters) {
        const company = await this.companyRepository.findPublicCompanyById(id);
        if (!company)
            return null;
        const where = { company_id: id };
        if (filters.department?.trim()) {
            where.department = filters.department.trim();
        }
        if (filters.location?.trim()) {
            where.location = filters.location.trim();
        }
        if (filters.search?.trim()) {
            const search = filters.search.trim();
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { job_summary: { contains: search, mode: 'insensitive' } },
            ];
        }
        const jobsResult = await this.jobRepository.findPublicJobs(where, filters.limit, filters.offset);
        return {
            jobs: jobsResult.jobs.map((job) => this.toPublicJob(job)),
            total: jobsResult.total,
        };
    }
    async getRelatedJobs(jobId, limit = 5) {
        const job = await this.jobRepository.findById(jobId);
        if (!job)
            return { jobs: [] };
        // Find jobs in same category or same company
        const where = {
            id: { not: jobId },
            status: 'OPEN',
            visibility: 'public',
            OR: [
                { category: job.category },
                { company_id: job.company_id }
            ]
        };
        const result = await this.jobRepository.findPublicJobs(where, limit, 0);
        return {
            jobs: result.jobs.map((job) => this.toPublicJob(job)),
            total: result.total,
        };
    }
    async trackJobView(jobId, data) {
        try {
            await this.jobRepository.createJobAnalytics({
                job_id: jobId,
                event_type: data.event_type || 'VIEW',
                source: data.source || 'HRM8_BOARD',
                session_id: data.session_id,
                referrer: data.referrer,
                ip_address: data.ip,
                user_agent: data.userAgent
            });
            return true;
        }
        catch (error) {
            console.error('[PublicService] trackJobView failed:', error);
            return false;
        }
    }
    async getFilters() {
        return this.jobRepository.getPublicJobFilters();
    }
    async getAggregations() {
        return this.jobRepository.getPublicJobAggregations();
    }
    async getApplicationForm(jobId, opts) {
        const job = await this.jobRepository.findById(jobId);
        if (!job || job.status !== 'OPEN') {
            return null;
        }
        // For private jobs, verify invitation access
        if (job.visibility !== 'public') {
            let hasAccess = false;
            if (opts?.invitationToken) {
                const invitation = await prisma_1.prisma.jobInvitation.findFirst({
                    where: { job_id: jobId, token: opts.invitationToken, status: { in: ['PENDING', 'ACCEPTED'] } },
                });
                hasAccess = !!invitation;
            }
            if (!hasAccess && opts?.candidateEmail) {
                const invitation = await prisma_1.prisma.jobInvitation.findFirst({
                    where: { job_id: jobId, email: { equals: opts.candidateEmail, mode: 'insensitive' }, status: { in: ['PENDING', 'ACCEPTED'] } },
                });
                hasAccess = !!invitation;
            }
            if (!hasAccess) {
                return null;
            }
        }
        const appForm = job.application_form || {};
        return {
            jobId: job.id,
            jobTitle: job.title,
            questions: appForm.questions || [],
            requireResume: appForm.requireResume !== false,
            requireCoverLetter: appForm.requireCoverLetter === true,
            requirePortfolio: appForm.requirePortfolio === true
        };
    }
    async submitGuestApplication(data) {
        // Import services
        const { CandidateRepository } = await Promise.resolve().then(() => __importStar(require('../candidate/candidate.repository')));
        const { ApplicationRepository } = await Promise.resolve().then(() => __importStar(require('../application/application.repository')));
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        const candidateRepository = new CandidateRepository();
        const applicationRepository = new ApplicationRepository();
        const { jobId, email, password, firstName, lastName, phone, resumeUrl, coverLetterUrl, portfolioUrl, answers, jobTargetAttribution, } = data;
        const attribution = jobtarget_service_1.jobTargetService.extractAttribution(jobTargetAttribution);
        const sourceLabel = jobtarget_service_1.jobTargetService.sourceLabelFromAttribution(attribution);
        // Validate job exists and is open
        const job = await this.jobRepository.findById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }
        if (job.status !== 'OPEN') {
            throw new Error('Job is not accepting applications');
        }
        // For private jobs, verify invitation
        if (job.visibility !== 'public') {
            const invitation = await prisma_1.prisma.jobInvitation.findFirst({
                where: {
                    job_id: jobId,
                    email: { equals: email.toLowerCase(), mode: 'insensitive' },
                    status: { in: ['PENDING', 'ACCEPTED'] },
                },
            });
            if (!invitation) {
                throw new Error('This is a private job. You must be invited to apply.');
            }
            // Mark invitation as accepted
            await prisma_1.prisma.jobInvitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED', accepted_at: new Date() },
            });
        }
        // Check if candidate exists
        let candidate = await candidateRepository.findByEmail(email.toLowerCase());
        if (candidate) {
            throw new Error('An account with this email already exists. Please login to apply.');
        }
        // Create new candidate account
        const hashedPassword = await bcrypt.hash(password, 10);
        candidate = await candidateRepository.create({
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            status: 'ACTIVE',
            email_verified: false
        });
        // Create application
        const application = await applicationRepository.create({
            candidate: { connect: { id: candidate.id } },
            job: { connect: { id: jobId } },
            status: 'NEW',
            stage: 'NEW_APPLICATION',
            resume_url: resumeUrl || null,
            cover_letter_url: coverLetterUrl || null,
            portfolio_url: portfolioUrl || null,
            custom_answers: (answers || {}),
            source: sourceLabel,
            job_target_attribution: attribution,
        });
        await jobtarget_service_1.jobTargetService.retryPendingSyncIfDue(application.id, application.stage);
        await jobtarget_service_1.jobTargetService.syncNewApplicationEvent(application.id);
        return {
            application,
            candidate: {
                id: candidate.id,
                email: candidate.email,
                firstName: candidate.first_name,
                lastName: candidate.last_name
            }
        };
    }
}
exports.PublicService = PublicService;
