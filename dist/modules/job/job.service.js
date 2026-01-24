"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobService = exports.JobService = void 0;
const service_1 = require("../../core/service");
const types_1 = require("../../types");
const job_repository_1 = require("./job.repository");
const job_allocation_service_1 = require("../hrm8/job-allocation.service");
const job_payment_service_1 = require("../payment/job-payment.service");
const job_round_service_1 = require("./job-round.service");
const candidate_job_service_1 = require("../candidate/candidate-job.service");
const client_1 = require("@prisma/client");
class JobService extends service_1.BaseService {
    constructor(repository = job_repository_1.jobRepository, companyRepository = companyRepository, jobAllocationServiceRef = job_allocation_service_1.jobAllocationService, jobPaymentServiceRef = job_payment_service_1.jobPaymentService, jobRoundServiceRef = job_round_service_1.jobRoundService, candidateJobServiceRef = candidate_job_service_1.candidateJobService) {
        super();
        this.repository = repository;
        this.companyRepository = companyRepository;
        this.jobAllocationServiceRef = jobAllocationServiceRef;
        this.jobPaymentServiceRef = jobPaymentServiceRef;
        this.jobRoundServiceRef = jobRoundServiceRef;
        this.candidateJobServiceRef = candidateJobServiceRef;
    }
    async createJob(companyId, createdBy, jobData) {
        const jobCode = await this.generateJobCode(companyId);
        // Get company data
        const companySettings = await this.companyRepository.getJobAssignmentSettings(companyId);
        const company = await this.companyRepository.findById(companyId); // To get regionId
        const companyRegionId = company?.regionId;
        const jobAssignmentMode = companySettings?.jobAssignmentMode || types_1.JobAssignmentMode.AUTO_RULES_ONLY;
        const finalRegionId = jobData.regionId || companyRegionId;
        const servicePackage = jobData.servicePackage || 'self-managed';
        const requiresPayment = await this.jobPaymentServiceRef.requiresPayment(servicePackage);
        const paymentStatus = requiresPayment ? undefined : client_1.PaymentStatus.PAID;
        const finalJobData = {
            companyId,
            createdBy,
            jobCode,
            title: jobData.title,
            description: jobData.description,
            jobSummary: jobData.jobSummary,
            status: types_1.JobStatus.DRAFT,
            hiringMode: jobData.hiringMode,
            location: jobData.location,
            department: jobData.department,
            workArrangement: jobData.workArrangement,
            employmentType: jobData.employmentType,
            numberOfVacancies: jobData.numberOfVacancies || 1,
            salaryMin: jobData.salaryMin,
            salaryMax: jobData.salaryMax,
            salaryCurrency: jobData.salaryCurrency || 'USD',
            salaryDescription: jobData.salaryDescription,
            category: jobData.category,
            promotionalTags: jobData.promotionalTags || [],
            featured: jobData.featured || false,
            stealth: jobData.stealth || false,
            visibility: jobData.visibility || 'public',
            requirements: jobData.requirements || [],
            responsibilities: jobData.responsibilities || [],
            termsAccepted: jobData.termsAccepted || false,
            termsAcceptedAt: jobData.termsAcceptedAt,
            termsAcceptedBy: jobData.termsAcceptedBy,
            expiryDate: jobData.expiryDate,
            hiringTeam: jobData.hiringTeam || [],
            applicationForm: jobData.applicationForm,
            videoInterviewingEnabled: jobData.videoInterviewingEnabled || false,
            assignmentMode: jobData.assignmentMode || types_1.AssignmentMode.AUTO,
            regionId: finalRegionId,
            servicePackage,
            paymentStatus,
        };
        const job = await this.repository.create(finalJobData);
        try {
            await this.jobRoundServiceRef.initializeFixedRounds(job.id);
        }
        catch (roundError) {
            console.error('⚠️ Failed to initialize fixed rounds (non-critical):', roundError);
        }
        try {
            if (job.status === types_1.JobStatus.OPEN && jobAssignmentMode === types_1.JobAssignmentMode.AUTO_RULES_ONLY && job.assignmentMode === types_1.AssignmentMode.AUTO) {
                await this.jobAllocationServiceRef.autoAssignJob(job.id);
            }
        }
        catch (autoAssignError) {
            console.error('❌ Auto-assignment error (non-fatal):', autoAssignError);
        }
        // Refresh job to get updated fields? Repository returns created object which should be fresh.
        return job;
    }
    async updateJob(jobId, companyId, jobData) {
        const existingJob = await this.repository.findById(jobId);
        if (!existingJob) {
            throw new Error('Job not found');
        }
        if (existingJob.companyId !== companyId) {
            throw new Error('Job does not belong to your company');
        }
        const updatedJob = await this.repository.update(jobId, jobData);
        return updatedJob;
    }
    async getJobById(jobId, companyId) {
        const job = await this.repository.findById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }
        if (job.companyId !== companyId) {
            throw new Error('Job does not belong to your company');
        }
        // Add pipeline info
        // const pipeline = await this.jobAllocationServiceRef.getPipelineForJob(jobId, job.assignedConsultantId);
        // return { ...job, pipeline };
        return job;
    }
    async getCompanyJobs(companyId, filters) {
        if (filters) {
            return await this.repository.findByCompanyIdWithFilters(companyId, filters);
        }
        return await this.repository.findByCompanyId(companyId);
    }
    async deleteJob(jobId, companyId) {
        const job = await this.repository.findById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }
        if (job.companyId !== companyId) {
            throw new Error('Job does not belong to your company');
        }
        await this.repository.delete(jobId);
    }
    async bulkDeleteJobs(jobIds, companyId) {
        return await this.repository.bulkDelete(jobIds, companyId);
    }
    async publishJob(jobId, companyId, userId) {
        const job = await this.getJobById(jobId, companyId);
        if (job.status !== types_1.JobStatus.DRAFT) {
            throw new Error('Only draft jobs can be published');
        }
        const canPublish = await this.jobPaymentServiceRef.canPublishJob(jobId);
        if (!canPublish) {
            // Handle payment logic (wallet deduction etc)
            // For now, assume payment service handles it or throws error
            await this.jobPaymentServiceRef.processWalletPayment(jobId, companyId);
        }
        const updatedJob = await this.repository.update(jobId, {
            status: types_1.JobStatus.OPEN,
            postingDate: job.postingDate || new Date(),
        });
        // Auto assign
        try {
            const companySettings = await this.companyRepository.getJobAssignmentSettings(companyId);
            if (updatedJob.assignmentMode === types_1.AssignmentMode.AUTO &&
                !updatedJob.assignedConsultantId &&
                companySettings?.jobAssignmentMode === types_1.JobAssignmentMode.AUTO_RULES_ONLY) {
                await this.jobAllocationServiceRef.autoAssignJob(updatedJob.id);
            }
        }
        catch (e) {
            console.error('Auto assign failed', e);
        }
        this.processJobAlertsAsync(updatedJob);
        return updatedJob;
    }
    async submitAndActivate(jobId, companyId, paymentId) {
        const job = await this.getJobById(jobId, companyId);
        if (job.status !== types_1.JobStatus.DRAFT) {
            throw new Error('Only draft jobs can be submitted');
        }
        const canPublish = await this.jobPaymentServiceRef.canPublishJob(jobId);
        if (!canPublish) {
            await this.jobPaymentServiceRef.processWalletPayment(jobId, companyId);
        }
        const shareLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/jobs/${jobId}`;
        const referralLink = `${shareLink}?ref=${jobId.substring(0, 8)}`;
        const updatedJob = await this.repository.update(jobId, {
            status: types_1.JobStatus.OPEN,
            postingDate: job.postingDate || new Date(),
            shareLink,
            referralLink
        });
        // Auto assign logic here too...
        this.processJobAlertsAsync(updatedJob);
        return updatedJob;
    }
    async updateAlerts(jobId, companyId, alertsConfig) {
        await this.getJobById(jobId, companyId);
        return await this.repository.update(jobId, { alertsEnabled: alertsConfig });
    }
    async saveDraft(jobId, companyId, jobData) {
        await this.getJobById(jobId, companyId);
        return await this.repository.update(jobId, { ...jobData, status: types_1.JobStatus.DRAFT });
    }
    async generateJobCode(companyId) {
        const jobs = await this.repository.findByCompanyId(companyId);
        const jobNumber = jobs.length + 1;
        return `JOB-${String(jobNumber).padStart(3, '0')}`;
    }
    async processJobAlertsAsync(job) {
        try {
            await this.candidateJobServiceRef.processJobAlerts(job);
        }
        catch (e) {
            console.error('Failed to process job alerts', e);
        }
    }
}
exports.JobService = JobService;
exports.jobService = new JobService();
