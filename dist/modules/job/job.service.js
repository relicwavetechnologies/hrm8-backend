"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobService = void 0;
const service_1 = require("../../core/service");
const client_1 = require("@prisma/client");
const http_exception_1 = require("../../core/http-exception");
const email_service_1 = require("../email/email.service");
const email_service_2 = require("../email/email.service");
const salary_band_service_1 = require("../pricing/salary-band.service");
const job_payment_service_1 = require("./job-payment.service");
const job_alert_service_1 = require("../candidate/job-alert.service");
const prisma_1 = require("../../utils/prisma");
const job_usage_engine_1 = require("./job-usage.engine");
const subscription_service_1 = require("../subscription/subscription.service");
const env_1 = require("../../config/env");
const job_allocation_service_1 = require("./job-allocation.service");
const commission_service_1 = require("../hrm8/commission.service");
const commission_repository_1 = require("../hrm8/commission.repository");
class JobService extends service_1.BaseService {
    constructor(jobRepository, applicationRepository, notificationService, jobRoundService) {
        super();
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.notificationService = notificationService;
        this.jobRoundService = jobRoundService;
    }
    async createJob(companyId, createdBy, data) {
        const jobCode = await this.generateJobCode(companyId);
        // Check company settings for assignment mode
        // Ideally this should fetch company settings from CompanyService/Repo
        // Assuming defaults for now or logic to be injected
        const assignmentMode = data.assignmentMode || 'AUTO';
        console.log('[JobService] createJob received data:', JSON.stringify(data, null, 2));
        // Always create as DRAFT.
        // Publishing must go through publishJob() so quota/wallet/assignment rules are enforced centrally.
        const publishImmediately = false;
        const servicePackage = data.servicePackage || data.hiringMode || 'full-service';
        const jobPayload = {
            // Explicitly map all fields to ensure no data loss
            company: { connect: { id: companyId } },
            creator: { connect: { id: createdBy } },
            job_code: jobCode,
            status: publishImmediately ? 'OPEN' : 'DRAFT',
            assignment_mode: assignmentMode,
            title: data.title,
            description: data.description,
            department: data.department,
            location: data.location,
            hiring_mode: data.hiringMode,
            service_package: data.servicePackage || data.hiringMode?.toLowerCase().replace(/_/g, '-') || undefined,
            work_arrangement: (data.workArrangement?.toUpperCase().replace('-', '_')) || 'ON_SITE',
            employment_type: (data.employmentType?.toUpperCase().replace('-', '_')) || 'FULL_TIME',
            // experience_level: data.experienceLevel, // Removed: Not in schema
            number_of_vacancies: data.numberOfVacancies || 1,
            // Salary Fields
            salary_min: data.salaryMin,
            salary_max: data.salaryMax,
            salary_currency: data.salaryCurrency || 'USD',
            // salary_period: data.salaryPeriod, // Removed as per schema constraints
            salary_description: data.salaryDescription,
            // hide_salary: data.hideSalary, // Removed: Not in schema
            // Content Arrays
            requirements: data.requirements || [],
            responsibilities: data.responsibilities || [],
            promotional_tags: data.tags || data.promotionalTags || [], // Map tags to promotional_tags
            // Configs
            video_interviewing_enabled: data.videoInterviewingEnabled || false,
            application_form: data.applicationForm ? data.applicationForm : undefined,
            // Logistic
            close_date: data.closeDate,
            visibility: data.visibility || 'public',
            posting_date: publishImmediately ? new Date() : null,
            // Post-job setup flow (Simple vs Advanced)
            ...(data.setupType && { setup_type: data.setupType.toUpperCase() === 'SIMPLE' ? 'SIMPLE' : 'ADVANCED' }),
            ...(data.managementType && { management_type: data.managementType }),
        };
        console.log('[JobService] Transformed Payload:', JSON.stringify(jobPayload, null, 2));
        const job = await this.jobRepository.create(jobPayload);
        // Create default per-job roles for post-job setup (production-grade)
        await this.jobRepository.createJobRoles(job.id, [
            { name: 'Hiring Manager', isDefault: true },
            { name: 'Recruiter', isDefault: true },
            { name: 'Interviewer', isDefault: true },
        ]);
        // Process payment if publishing immediately
        if (publishImmediately && data.salaryMax && job_payment_service_1.jobPaymentService) {
            try {
                // Calculate pricing
                const bandInfo = await salary_band_service_1.SalaryBandService.determineJobBand(companyId, data.salaryMax);
                console.log('[JobService] Pricing calculated for job:', {
                    jobId: job.id,
                    isExecutiveSearch: bandInfo.isExecutiveSearch,
                    band: bandInfo.band,
                    price: bandInfo.price,
                    currency: bandInfo.currency
                });
                // Process payment from wallet
                const paymentResult = await job_payment_service_1.jobPaymentService.payForJobFromWallet(companyId, job.id, data.salaryMax, servicePackage, createdBy);
                if (paymentResult.success) {
                    console.log('[JobService] ✅ Payment processed successfully for job:', job.id);
                }
                else {
                    console.warn('[JobService] ⚠️  Payment failed, job created as DRAFT:', paymentResult.error);
                    // Update job back to DRAFT if payment fails
                    await this.jobRepository.update(job.id, {
                        status: 'DRAFT',
                        posting_date: null
                    });
                }
            }
            catch (error) {
                console.error('[JobService] Payment processing error:', error);
                // Update job back to DRAFT if payment fails
                await this.jobRepository.update(job.id, {
                    status: 'DRAFT',
                    posting_date: null
                });
            }
        }
        else if (data.salaryMax && data.salaryMax > 0) {
            // Just calculate pricing for display (no payment)
            try {
                const bandInfo = await salary_band_service_1.SalaryBandService.determineJobBand(companyId, data.salaryMax);
                console.log('[JobService] Pricing calculated (no payment):', {
                    jobId: job.id,
                    isExecutiveSearch: bandInfo.isExecutiveSearch,
                    band: bandInfo.band,
                    price: bandInfo.price,
                    currency: bandInfo.currency
                });
            }
            catch (error) {
                console.warn('[JobService] Failed to calculate job pricing:', error);
            }
        }
        return this.mapToResponse(job);
    }
    async updateJob(id, companyId, data) {
        const job = await this.jobRepository.findById(id);
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        if (job.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        // Map fields for update
        const updateData = {
            title: data.title,
            description: data.description,
            job_summary: data.jobSummary,
            location: data.location,
            department: data.department,
            hiring_mode: data.hiringMode,
            service_package: data.servicePackage ?? (data.hiringMode ? data.hiringMode.toLowerCase().replace(/_/g, '-') : undefined),
            work_arrangement: data.workArrangement ? (data.workArrangement.toUpperCase().replace('-', '_')) : undefined,
            employment_type: data.employmentType ? (data.employmentType.toUpperCase().replace('-', '_')) : undefined,
            number_of_vacancies: data.numberOfVacancies,
            salary_min: data.salaryMin,
            salary_max: data.salaryMax,
            salary_currency: data.salaryCurrency,
            salary_description: data.salaryDescription,
            requirements: data.requirements,
            responsibilities: data.responsibilities,
            promotional_tags: data.tags || data.promotionalTags,
            application_form: data.applicationForm,
            close_date: data.closeDate,
            video_interviewing_enabled: data.videoInterviewingEnabled,
            setup_type: data.setupType ? data.setupType.toUpperCase() : undefined,
            management_type: data.managementType ?? undefined,
            draft_step: data.draftStep,
            status: data.status,
        };
        // Remove undefined keys
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined)
                delete updateData[key];
        });
        const updatedJob = await this.jobRepository.update(id, updateData);
        // If switching to SIMPLE flow, ensure default rounds exist
        if (data.setupType === 'simple' || data.setupType === 'SIMPLE') {
            if (this.jobRoundService) {
                await this.jobRoundService.initializeSimpleRounds(id);
            }
        }
        return this.mapToResponse(updatedJob);
    }
    async getJob(id, companyId) {
        const job = await this.jobRepository.findById(id);
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        if (job.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        return this.mapToResponse(job);
    }
    async resolveJobId(idOrCode, companyId) {
        let job = await this.jobRepository.findById(idOrCode);
        if (!job) {
            job = await this.jobRepository.findByJobCode(idOrCode);
        }
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        if (job.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        return job.id;
    }
    async getCompanyJobs(companyId, filters) {
        const jobs = await this.jobRepository.findByCompanyIdWithFilters(companyId, filters);
        // Map database fields to API response format (camelCase)
        const mappedJobs = jobs.map(job => this.mapToResponse(job));
        // If ApplicationRepository is available, add application counts to each job
        if (this.applicationRepository) {
            const jobsWithCounts = await Promise.all(mappedJobs.map(async (job) => {
                const counts = await this.applicationRepository.countByJobId(job.id);
                const unreadCounts = await this.applicationRepository.countUnreadByJobId(job.id);
                return {
                    ...job,
                    totalApplications: counts,
                    unreadApplicants: unreadCounts,
                };
            }));
            return jobsWithCounts;
        }
        return mappedJobs;
    }
    _draftStepFromJob(job) {
        const raw = job?.draft_step ?? job?.draftStep;
        if (raw == null)
            return 1;
        const n = Number(raw);
        return Number.isInteger(n) && n >= 1 ? n : 1;
    }
    normalizeServicePackage(servicePackage, hiringMode) {
        const normalizedRaw = String(servicePackage || '')
            .trim()
            .toLowerCase()
            .replace(/_/g, '-');
        const packageMap = {
            'self-managed': 'self-managed',
            self: 'self-managed',
            shortlisting: 'shortlisting',
            'full-service': 'full-service',
            full: 'full-service',
            'executive-search': 'executive-search',
            executive: 'executive-search',
            rpo: 'full-service',
        };
        if (normalizedRaw && packageMap[normalizedRaw]) {
            return packageMap[normalizedRaw];
        }
        const mode = String(hiringMode || '')
            .trim()
            .toUpperCase();
        const modeMap = {
            SELF_MANAGED: 'self-managed',
            SHORTLISTING: 'shortlisting',
            FULL_SERVICE: 'full-service',
            EXECUTIVE_SEARCH: 'executive-search',
        };
        return modeMap[mode] || 'self-managed';
    }
    hiringModeForServicePackage(servicePackage) {
        const map = {
            'self-managed': 'SELF_MANAGED',
            shortlisting: 'SHORTLISTING',
            'full-service': 'FULL_SERVICE',
            'executive-search': 'EXECUTIVE_SEARCH',
        };
        return map[servicePackage];
    }
    async ensureRecruitmentCommission(consultantId, jobId, jobTitle) {
        const existing = await prisma_1.prisma.commission.findFirst({
            where: {
                consultant_id: consultantId,
                job_id: jobId,
                type: 'RECRUITMENT_SERVICE',
            },
            select: { id: true },
        });
        if (existing)
            return;
        try {
            const commissionService = new commission_service_1.CommissionService(new commission_repository_1.CommissionRepository());
            await commissionService.requestCommission({
                consultantId,
                type: 'RECRUITMENT_SERVICE',
                jobId,
                calculateFromJob: true,
                description: `Commission for job: ${jobTitle}`,
            });
            console.log(`[JobService] Commission created for consultant ${consultantId} on job ${jobId}`);
        }
        catch (err) {
            console.error(`[JobService] Commission creation failed for job ${jobId}:`, err);
            // Non-fatal: job flow should still continue if commission creation fails
        }
    }
    mapToResponse(job) {
        if (!job)
            return null;
        const servicePackage = this.normalizeServicePackage(job.service_package, job.hiring_mode);
        // Return ONLY camelCase fields (no duplication)
        return {
            id: job.id,
            companyId: job.company_id,
            createdBy: job.created_by,
            jobCode: job.job_code,
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            responsibilities: job.responsibilities,
            department: job.department,
            location: job.location,
            country: job.country,
            hiringMode: job.hiring_mode,
            workArrangement: job.work_arrangement,
            employmentType: job.employment_type,
            numberOfVacancies: job.number_of_vacancies,
            salaryMin: job.salary_min,
            salaryMax: job.salary_max,
            salaryCurrency: job.salary_currency,
            salaryPeriod: job.salary_period,
            salaryDescription: job.salary_description,
            experienceLevel: job.experience_level,
            status: job.status,
            visibility: job.visibility,
            stealth: job.stealth,
            promotionalTags: job.promotional_tags,
            videoInterviewingEnabled: job.video_interviewing_enabled,
            assignmentMode: job.assignment_mode,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
            postingDate: job.posting_date,
            closeDate: job.close_date,
            archived: job.archived,
            archivedAt: job.archived_at,
            archivedBy: job.archived_by,
            savedAsTemplate: job.saved_as_template,
            applicationForm: job.application_form,
            hiringTeam: job.hiring_team,
            jobBoardDistribution: job.job_board_distribution,
            serviceType: servicePackage,
            servicePackage,
            paymentStatus: job.payment_status ?? 'PENDING',
            paymentAmount: job.payment_amount,
            paymentCurrency: job.payment_currency,
            paymentCompletedAt: job.payment_completed_at,
            paymentFailedAt: job.payment_failed_at,
            stripeSessionId: job.stripe_session_id,
            stripePaymentIntentId: job.stripe_payment_intent_id,
            assignedConsultantId: job.assigned_consultant_id,
            assignedConsultantName: job.assigned_consultant_name,
            applicantsCount: job._count?.applications || 0,
            setupType: job.setup_type ? job.setup_type.toLowerCase() : 'advanced',
            managementType: job.management_type ?? undefined,
            draftStep: this._draftStepFromJob(job),
        };
    }
    async deleteJob(id, companyId) {
        const job = await this.jobRepository.findById(id);
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        if (job.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        return this.jobRepository.delete(id);
    }
    async bulkDeleteJobs(jobIds, companyId) {
        if (!jobIds || jobIds.length === 0) {
            throw new http_exception_1.HttpException(400, 'No job IDs provided');
        }
        // Verify all jobs belong to company
        const jobs = await this.jobRepository.findByCompanyId(companyId);
        const validJobIds = jobs.filter(job => jobIds.includes(job.id)).map(job => job.id);
        if (validJobIds.length === 0) {
            throw new http_exception_1.HttpException(400, 'No valid jobs found for deletion');
        }
        const deletedCount = await this.jobRepository.bulkDelete(validJobIds, companyId);
        return deletedCount;
    }
    /**
     * Archive a job
     */
    async archiveJob(id, companyId, userId) {
        await this.getJob(id, companyId); // Verify ownership
        const updatedJob = await this.jobRepository.update(id, {
            archived: true,
            archived_at: new Date(),
            archived_by: userId,
        });
        return this.mapToResponse(updatedJob);
    }
    /**
     * Unarchive a job
     */
    async unarchiveJob(id, companyId) {
        await this.getJob(id, companyId); // Verify ownership
        const updatedJob = await this.jobRepository.update(id, {
            archived: false,
            archived_at: null,
            archived_by: null,
        });
        return this.mapToResponse(updatedJob);
    }
    /**
     * Bulk archive jobs
     */
    async bulkArchiveJobs(jobIds, companyId, userId) {
        if (!jobIds || jobIds.length === 0) {
            throw new http_exception_1.HttpException(400, 'No job IDs provided');
        }
        // Verify all jobs belong to company
        const jobs = await this.jobRepository.findByCompanyId(companyId);
        const validJobIds = jobs.filter(job => jobIds.includes(job.id)).map(job => job.id);
        if (validJobIds.length === 0) {
            throw new http_exception_1.HttpException(400, 'No valid jobs found for archiving');
        }
        const result = await this.jobRepository.bulkArchive(validJobIds, companyId, userId);
        return result;
    }
    /**
     * Bulk unarchive jobs
     */
    async bulkUnarchiveJobs(jobIds, companyId) {
        if (!jobIds || jobIds.length === 0) {
            throw new http_exception_1.HttpException(400, 'No job IDs provided');
        }
        // Verify all jobs belong to company
        const jobs = await this.jobRepository.findByCompanyId(companyId);
        const validJobIds = jobs.filter(job => jobIds.includes(job.id)).map(job => job.id);
        if (validJobIds.length === 0) {
            throw new http_exception_1.HttpException(400, 'No valid jobs found for unarchiving');
        }
        const result = await this.jobRepository.bulkUnarchive(validJobIds, companyId);
        return result;
    }
    async publishJob(id, companyId, userId, options) {
        const job = await this.jobRepository.findById(id);
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        if (job.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        // Idempotency: if already published, return success
        if (job.status === 'OPEN') {
            return this.mapToResponse(job);
        }
        if (job.status !== 'DRAFT') {
            throw new http_exception_1.HttpException(400, 'Only draft jobs can be published');
        }
        // Handle "Save as Template" if requested
        if (options?.saveAsTemplate) {
            try {
                const templateName = options.templateName || `${job.title} Template`;
                await this.saveAsTemplate(id, companyId, templateName);
                console.log(`[JobService] Created template "${templateName}" during publish for job ${id}`);
            }
            catch (templateError) {
                console.error('[JobService] Failed to save as template during publish:', templateError);
            }
        }
        // ─── UsageEngine: Central decision point ───
        const hiringMode = job.hiring_mode || 'SELF_MANAGED';
        const decision = await job_usage_engine_1.UsageEngine.resolveJobPublish(companyId, hiringMode);
        console.log(`[JobService] UsageEngine decision for job ${id}: ${decision}`);
        let updatedJob;
        switch (decision) {
            case 'REQUIRE_SUBSCRIPTION': {
                throw new http_exception_1.HttpException(402, 'Active subscription required to publish jobs');
            }
            case 'QUOTA_EXHAUSTED': {
                throw new http_exception_1.HttpException(402, 'Job posting quota exhausted. Please upgrade your subscription.');
            }
            case 'USE_QUOTA': {
                // Self-managed publish: quota only. No wallet, no commission.
                await subscription_service_1.SubscriptionService.useQuotaOnly(companyId);
                console.log(`[JobService] Quota consumed for self-managed job ${id}`);
                updatedJob = await this.jobRepository.update(id, {
                    status: 'OPEN',
                    posting_date: new Date(),
                });
                break;
            }
            case 'HRM8_MANAGED': {
                // HRM8-managed publish:
                // 1) requires subscription/quota (checked by UsageEngine)
                // 2) wallet debit for selected managed service
                // 3) auto-assign consultant
                // 4) consume quota
                // 5) create commission
                // 6) activate job
                const servicePackage = this.normalizeServicePackage(job.service_package, hiringMode);
                // Step 1: Wallet debit
                if (job.payment_status !== 'PAID') {
                    const paymentResult = await job_payment_service_1.jobPaymentService.payForJobFromWallet(companyId, id, (job.salary_max ?? job.salary_min ?? 0) || 0, servicePackage, userId || job.created_by);
                    if (!paymentResult.success) {
                        throw new http_exception_1.HttpException(402, paymentResult.error || 'Insufficient wallet balance for this service');
                    }
                }
                // Step 2: Auto-assign consultant (after successful payment).
                let consultantId = job.assigned_consultant_id || null;
                if (!consultantId) {
                    const assignResult = await job_allocation_service_1.jobAllocationService.autoAssignJob(id);
                    if (!assignResult.success || !assignResult.consultantId) {
                        throw new http_exception_1.HttpException(503, assignResult.error || 'No consultant available for assignment. Please try again later.');
                    }
                    consultantId = assignResult.consultantId;
                    console.log(`[JobService] Consultant ${consultantId} auto-assigned to job ${id}`);
                }
                else {
                    console.log(`[JobService] Reusing existing consultant assignment ${consultantId} for job ${id}`);
                }
                // Step 3: Consume subscription quota (same publish rule as self-managed jobs).
                await subscription_service_1.SubscriptionService.useQuotaOnly(companyId);
                console.log(`[JobService] Quota consumed for HRM8-managed job ${id}`);
                // Step 4: Create commission (only after successful wallet debit)
                await this.ensureRecruitmentCommission(consultantId, id, job.title);
                // Step 5: Activate job
                updatedJob = await this.jobRepository.update(id, {
                    status: 'OPEN',
                    posting_date: new Date(),
                    management_type: 'hrm8-managed',
                    setup_type: 'ADVANCED',
                    service_package: servicePackage,
                    hiring_mode: this.hiringModeForServicePackage(servicePackage),
                });
                break;
            }
        }
        // ─── Post-publish actions (shared) ───
        // Notification
        if (this.notificationService && userId) {
            await this.notificationService.createNotification({
                recipientType: client_1.NotificationRecipientType.USER,
                recipientId: userId,
                type: client_1.UniversalNotificationType.JOB_PUBLISHED,
                title: 'Job Published',
                message: `Your job "${updatedJob.title}" has been successfully published.`,
                data: { jobId: id, companyId },
                actionUrl: `/ats/jobs/${id}`
            });
        }
        // Job alerts (fire and forget)
        if (this.notificationService) {
            const emailSvc = new email_service_1.EmailService();
            const jobAlertService = new job_alert_service_1.JobAlertService(this.notificationService, emailSvc);
            jobAlertService.processJobAlerts(updatedJob).catch((error) => {
                console.error('[JobService] Failed to process job alerts:', error);
            });
        }
        return this.mapToResponse(updatedJob);
    }
    async saveDraft(id, companyId, data) {
        await this.getJob(id, companyId); // Verify ownership
        const stepRaw = data.draftStep ?? data.draft_step;
        const stepNum = stepRaw != null ? Number(stepRaw) : NaN;
        const draftStepValue = Number.isInteger(stepNum) && stepNum >= 1 ? stepNum : 1;
        const updatePayload = {
            status: 'DRAFT',
            draft_step: draftStepValue,
            title: data.title,
            description: data.description,
            department: data.department,
            location: data.location,
            number_of_vacancies: data.numberOfVacancies ?? data.number_of_vacancies,
            salary_min: data.salaryMin ?? data.salary_min,
            salary_max: data.salaryMax ?? data.salary_max,
            salary_currency: data.salaryCurrency ?? data.salary_currency,
            salary_period: data.salaryPeriod ?? data.salary_period,
            salary_description: data.salaryDescription ?? data.salary_description,
            requirements: data.requirements ?? [],
            responsibilities: data.responsibilities ?? [],
            promotional_tags: data.tags ?? data.promotionalTags ?? data.promotional_tags ?? [],
            application_form: data.applicationForm ?? data.application_form,
            close_date: data.closeDate ?? data.close_date,
            visibility: data.visibility ?? 'public',
            work_arrangement: data.workArrangement ? String(data.workArrangement).toUpperCase().replace('-', '_') : undefined,
            employment_type: data.employmentType ? String(data.employmentType).toUpperCase().replace('-', '_') : undefined,
            experience_level: data.experienceLevel ?? data.experience_level,
            hide_salary: data.hideSalary ?? data.hide_salary,
        };
        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined)
                delete updatePayload[key];
        });
        const updatedJob = await this.jobRepository.update(id, updatePayload);
        return this.mapToResponse(updatedJob);
    }
    async submitAndActivate(id, companyId, userId, paymentId) {
        // Legacy endpoint compatibility:
        // force all submit/publish requests through the centralized publish flow.
        if (paymentId) {
            const job = await this.jobRepository.findById(id);
            if (!job)
                throw new http_exception_1.HttpException(404, 'Job not found');
            if (job.company_id !== companyId)
                throw new http_exception_1.HttpException(403, 'Unauthorized');
            await this.jobRepository.update(id, {
                stripe_payment_intent_id: paymentId,
            });
        }
        return this.publishJob(id, companyId, userId);
    }
    async upgradeToManagedService(id, companyId, userId, payload) {
        const job = await this.jobRepository.findById(id);
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        if (job.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        const servicePackage = this.normalizeServicePackage(payload.servicePackage, job.hiring_mode);
        if (servicePackage === 'self-managed') {
            throw new http_exception_1.HttpException(400, 'Managed service package is required');
        }
        const hiringMode = this.hiringModeForServicePackage(servicePackage);
        // Draft jobs must be published through the centralized flow so subscription quota
        // and wallet/assignment logic remain consistent.
        if (job.status === 'DRAFT') {
            await this.jobRepository.update(id, {
                service_package: servicePackage,
                hiring_mode: hiringMode,
                management_type: 'hrm8-managed',
                setup_type: 'ADVANCED',
            });
            return this.publishJob(id, companyId, userId);
        }
        if (job.status !== 'OPEN') {
            throw new http_exception_1.HttpException(400, 'Only OPEN or DRAFT jobs can be upgraded to HRM8 managed');
        }
        const alreadyConfigured = this.normalizeServicePackage(job.service_package, job.hiring_mode) === servicePackage &&
            job.hiring_mode === hiringMode &&
            job.payment_status === 'PAID' &&
            !!job.assigned_consultant_id &&
            job.management_type === 'hrm8-managed';
        if (!alreadyConfigured) {
            const shouldChargeWallet = job.payment_status !== 'PAID' ||
                this.normalizeServicePackage(job.service_package, job.hiring_mode) !== servicePackage;
            if (shouldChargeWallet) {
                const paymentResult = await job_payment_service_1.jobPaymentService.payForJobFromWallet(companyId, id, (job.salary_max ?? job.salary_min ?? 0) || 0, servicePackage, userId || job.created_by);
                if (!paymentResult.success) {
                    throw new http_exception_1.HttpException(402, paymentResult.error || 'Insufficient wallet balance for this service');
                }
            }
            let consultantId = job.assigned_consultant_id || null;
            if (!consultantId) {
                const assignResult = await job_allocation_service_1.jobAllocationService.autoAssignJob(id);
                if (!assignResult.success || !assignResult.consultantId) {
                    throw new http_exception_1.HttpException(503, assignResult.error || 'No consultant available for assignment. Please try again later.');
                }
                consultantId = assignResult.consultantId;
            }
            await this.ensureRecruitmentCommission(consultantId, id, job.title);
        }
        const updatedJob = await this.jobRepository.update(id, {
            service_package: servicePackage,
            hiring_mode: hiringMode,
            management_type: 'hrm8-managed',
            setup_type: 'ADVANCED',
            status: 'OPEN',
            posting_date: job.posting_date ?? new Date(),
        });
        return this.mapToResponse(updatedJob);
    }
    async updateAlerts(id, companyId, alertsConfig) {
        await this.getJob(id, companyId);
        const updatedJob = await this.jobRepository.update(id, {
            alerts_enabled: alertsConfig
        });
        return this.mapToResponse(updatedJob);
    }
    async saveAsTemplate(id, companyId, templateName, templateDescription) {
        const job = await this.jobRepository.findById(id);
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        if (job.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        const template = await prisma_1.prisma.jobTemplate.create({
            data: {
                company_id: companyId,
                created_by: job.created_by,
                name: templateName,
                description: templateDescription,
                source_job_id: job.id,
                job_data: job
            }
        });
        await this.jobRepository.update(id, {
            saved_as_template: true,
            template_id: template.id
        });
        return { job: this.mapToResponse(job), templateId: template.id };
    }
    async generateJobCode(companyId) {
        const count = await this.jobRepository.countByCompany(companyId);
        return `JOB-${String(count + 1).padStart(3, '0')}`;
    }
    async inviteTeamMember(jobId, companyId, data) {
        const { email, name, role, roles: roleIds, inviterId, permissions } = data;
        await this.getJob(jobId, companyId); // Verify access
        // Check if already in team
        const existingMember = await this.jobRepository.findTeamMemberByEmail(jobId, email);
        if (existingMember) {
            throw new http_exception_1.HttpException(400, 'User is already in the hiring team');
        }
        // Check if user exists
        const user = await this.jobRepository.findUserByEmail(email);
        const ids = Array.isArray(roleIds) ? roleIds : (role ? [] : []);
        await this.jobRepository.addTeamMember(jobId, {
            email,
            name: name || user?.name,
            role: (role || 'MEMBER').toUpperCase(),
            user_id: user?.id,
            status: 'ACTIVE',
            roleIds: ids,
            permissions,
        });
        // Send hiring team invitation email (non-blocking)
        this.sendHiringTeamInvitationEmail(jobId, companyId, {
            to: email,
            role: role || 'MEMBER',
            inviterId,
        }).catch((err) => console.error('[JobService] Failed to send hiring team invitation email', err));
    }
    /**
     * Sends hiring team invitation email. Does not throw; logs errors.
     */
    async sendHiringTeamInvitationEmail(jobId, companyId, opts) {
        const jobWithCompany = await prisma_1.prisma.job.findUnique({
            where: { id: jobId },
            select: { title: true, company_id: true, company: { select: { name: true } } },
        });
        if (!jobWithCompany || jobWithCompany.company_id !== companyId)
            return;
        const jobTitle = jobWithCompany.title ?? 'Job';
        const companyName = jobWithCompany.company?.name ?? 'Company';
        let inviterName = 'A colleague';
        if (opts.inviterId) {
            const inviter = await prisma_1.prisma.user.findUnique({
                where: { id: opts.inviterId },
                select: { name: true, email: true },
            });
            if (inviter?.name)
                inviterName = inviter.name;
            else if (inviter?.email)
                inviterName = inviter.email;
        }
        const inviteLink = `${env_1.env.FRONTEND_URL}/jobs/${jobId}`;
        await email_service_2.emailService.sendHiringTeamInvitation({
            to: opts.to,
            inviterName,
            jobTitle,
            companyName,
            role: opts.role,
            inviteLink,
        });
    }
    async getJobRoles(jobId, companyId) {
        await this.getJob(jobId, companyId);
        const roles = await this.jobRepository.getJobRoles(jobId);
        return roles.map((r) => ({
            id: r.id,
            name: r.name,
            isDefault: r.is_default,
        }));
    }
    async createJobRole(jobId, companyId, data) {
        await this.getJob(jobId, companyId);
        if (!data.name?.trim())
            throw new http_exception_1.HttpException(400, 'Role name is required');
        const role = await this.jobRepository.createJobRole(jobId, {
            name: data.name.trim(),
            isDefault: data.isDefault ?? false,
        });
        return { id: role.id, name: role.name, isDefault: role.is_default };
    }
    async getTeamMembers(jobId, companyId) {
        await this.getJob(jobId, companyId);
        const rows = await this.jobRepository.getTeamMembers(jobId);
        return rows.map((m) => ({
            id: m.id,
            userId: m.user_id,
            email: m.email,
            name: m.name,
            role: m.role?.toLowerCase(),
            permissions: m.permissions,
            status: m.status,
            invitedAt: m.invited_at,
            joinedAt: m.joined_at,
            roles: (m.member_roles || []).map((mr) => mr.job_role?.id ?? mr.job_role_id).filter(Boolean),
            roleDetails: (m.member_roles || []).map((mr) => mr.job_role ? { id: mr.job_role.id, name: mr.job_role.name } : null).filter(Boolean),
        }));
    }
    async removeTeamMember(jobId, memberId, companyId) {
        await this.getJob(jobId, companyId);
        // Ideally verify member belongs to job, but cascade delete handles cleanup if job deleted
        await this.jobRepository.removeTeamMember(memberId);
    }
    async updateTeamMemberRole(jobId, memberId, companyId, role) {
        await this.getJob(jobId, companyId);
        await this.jobRepository.updateTeamMember(memberId, { role: role?.toUpperCase() });
    }
    async updateTeamMemberRoles(jobId, memberId, companyId, roleIds) {
        await this.getJob(jobId, companyId);
        await this.jobRepository.setMemberJobRoles(memberId, roleIds ?? []);
    }
    async resendInvite(jobId, memberId, companyId, inviterId) {
        await this.getJob(jobId, companyId);
        const member = await this.jobRepository.getTeamMember(memberId);
        if (!member || member.job_id !== jobId)
            throw new http_exception_1.HttpException(404, 'Team member not found');
        await this.jobRepository.updateTeamMember(memberId, {
            invited_at: new Date(),
        });
        this.sendHiringTeamInvitationEmail(jobId, companyId, {
            to: member.email,
            role: member.role ?? 'MEMBER',
            inviterId,
        }).catch((err) => console.error('[JobService] Failed to resend hiring team invitation email', err));
    }
}
exports.JobService = JobService;
