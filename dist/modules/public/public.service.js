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
class PublicService extends service_1.BaseService {
    constructor(jobRepository, companyRepository) {
        super();
        this.jobRepository = jobRepository;
        this.companyRepository = companyRepository;
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
    async getPublicJob(id) {
        const job = await this.jobRepository.findById(id);
        if (!job || job.status !== 'OPEN' || job.visibility !== 'public') {
            return null;
        }
        // Check expiry
        if (job.expires_at && new Date() > job.expires_at) {
            return null;
        }
        const company = await this.companyRepository.findById(job.company_id);
        return {
            ...job,
            company: company ? {
                id: company.id,
                name: company.name,
                website: company.website,
                logoUrl: company.careers_page_logo
            } : { name: 'Unknown Company' }
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
        return this.jobRepository.findPublicJobs(where, limit, 0);
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
    async getApplicationForm(jobId) {
        const job = await this.jobRepository.findById(jobId);
        if (!job || job.status !== 'OPEN' || job.visibility !== 'public') {
            return null;
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
        const { jobId, email, password, firstName, lastName, phone, resumeUrl, coverLetterUrl, portfolioUrl, answers } = data;
        // Validate job exists and is open
        const job = await this.jobRepository.findById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }
        if (job.status !== 'OPEN') {
            throw new Error('Job is not accepting applications');
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
            custom_answers: (answers || {})
        });
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
