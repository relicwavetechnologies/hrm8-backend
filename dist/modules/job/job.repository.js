"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRepository = exports.JobRepository = void 0;
const repository_1 = require("../../core/repository");
class JobRepository extends repository_1.BaseRepository {
    async create(jobData) {
        const job = await this.prisma.job.create({
            data: {
                company_id: jobData.companyId,
                created_by: jobData.createdBy,
                job_code: jobData.jobCode,
                title: jobData.title,
                description: jobData.description,
                job_summary: jobData.jobSummary,
                status: jobData.status,
                hiring_mode: jobData.hiringMode,
                location: jobData.location,
                department: jobData.department,
                work_arrangement: jobData.workArrangement,
                employment_type: jobData.employmentType,
                number_of_vacancies: jobData.numberOfVacancies,
                salary_min: jobData.salaryMin,
                salary_max: jobData.salaryMax,
                salary_currency: jobData.salaryCurrency,
                salary_description: jobData.salaryDescription,
                category: jobData.category,
                promotional_tags: jobData.promotionalTags,
                featured: jobData.featured,
                stealth: jobData.stealth,
                visibility: jobData.visibility,
                requirements: jobData.requirements,
                responsibilities: jobData.responsibilities,
                terms_accepted: jobData.termsAccepted,
                terms_accepted_at: jobData.termsAcceptedAt,
                terms_accepted_by: jobData.termsAcceptedBy,
                expires_at: jobData.expiryDate, // Fixed: expiry_date -> expires_at
                hiring_team: jobData.hiringTeam,
                application_form: jobData.applicationForm,
                video_interviewing_enabled: jobData.videoInterviewingEnabled,
                assignment_mode: jobData.assignmentMode,
                region_id: jobData.regionId,
                service_package: jobData.servicePackage,
                payment_status: jobData.paymentStatus,
            },
        });
        return this.mapPrismaToJob(job);
    }
    async findById(id) {
        const job = await this.prisma.job.findUnique({
            where: { id },
        });
        return job ? this.mapPrismaToJob(job) : null;
    }
    async findByCompanyId(companyId) {
        const jobs = await this.prisma.job.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
        });
        return jobs.map((job) => this.mapPrismaToJob(job));
    }
    async findByCompanyIdWithFilters(companyId, filters) {
        const where = {
            company_id: companyId,
        };
        if (filters.status)
            where.status = filters.status;
        if (filters.department)
            where.department = filters.department;
        if (filters.location)
            where.location = { contains: filters.location, mode: 'insensitive' };
        if (filters.hiringMode)
            where.hiring_mode = filters.hiringMode;
        const jobs = await this.prisma.job.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
        return jobs.map((job) => this.mapPrismaToJob(job));
    }
    async update(id, data) {
        const updateData = {};
        if (data.title !== undefined)
            updateData.title = data.title;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.jobSummary !== undefined)
            updateData.job_summary = data.jobSummary;
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.hiringMode !== undefined)
            updateData.hiring_mode = data.hiringMode;
        if (data.location !== undefined)
            updateData.location = data.location;
        if (data.department !== undefined)
            updateData.department = data.department;
        if (data.workArrangement !== undefined)
            updateData.work_arrangement = data.workArrangement;
        if (data.employmentType !== undefined)
            updateData.employment_type = data.employmentType;
        if (data.numberOfVacancies !== undefined)
            updateData.number_of_vacancies = data.numberOfVacancies;
        if (data.salaryMin !== undefined)
            updateData.salary_min = data.salaryMin;
        if (data.salaryMax !== undefined)
            updateData.salary_max = data.salaryMax;
        if (data.salaryCurrency !== undefined)
            updateData.salary_currency = data.salaryCurrency;
        if (data.salaryDescription !== undefined)
            updateData.salary_description = data.salaryDescription;
        if (data.category !== undefined)
            updateData.category = data.category;
        if (data.promotionalTags !== undefined)
            updateData.promotional_tags = data.promotionalTags;
        if (data.featured !== undefined)
            updateData.featured = data.featured;
        if (data.stealth !== undefined)
            updateData.stealth = data.stealth;
        if (data.visibility !== undefined)
            updateData.visibility = data.visibility;
        if (data.requirements !== undefined)
            updateData.requirements = data.requirements;
        if (data.responsibilities !== undefined)
            updateData.responsibilities = data.responsibilities;
        if (data.expiryDate !== undefined)
            updateData.expires_at = data.expiryDate; // Fixed
        if (data.closeDate !== undefined)
            updateData.close_date = data.closeDate;
        if (data.postingDate !== undefined)
            updateData.posting_date = data.postingDate;
        if (data.applicationForm !== undefined)
            updateData.application_form = data.applicationForm;
        if (data.videoInterviewingEnabled !== undefined)
            updateData.video_interviewing_enabled = data.videoInterviewingEnabled;
        if (data.assignedConsultantId !== undefined)
            updateData.assigned_consultant_id = data.assignedConsultantId;
        if (data.shareLink !== undefined)
            updateData.share_link = data.shareLink;
        if (data.referralLink !== undefined)
            updateData.referral_link = data.referralLink;
        if (data.alertsEnabled !== undefined)
            updateData.alerts_enabled = data.alertsEnabled;
        const job = await this.prisma.job.update({
            where: { id },
            data: updateData,
        });
        return this.mapPrismaToJob(job);
    }
    async delete(id) {
        await this.prisma.job.delete({
            where: { id },
        });
    }
    async bulkDelete(ids, companyId) {
        const result = await this.prisma.job.deleteMany({
            where: {
                id: { in: ids },
                company_id: companyId,
            },
        });
        return result.count;
    }
    mapPrismaToJob(prismaJob) {
        return {
            id: prismaJob.id,
            companyId: prismaJob.company_id,
            createdBy: prismaJob.created_by,
            jobCode: prismaJob.job_code,
            title: prismaJob.title,
            description: prismaJob.description,
            jobSummary: prismaJob.job_summary || undefined,
            status: prismaJob.status,
            hiringMode: prismaJob.hiring_mode,
            location: prismaJob.location,
            department: prismaJob.department || undefined,
            workArrangement: prismaJob.work_arrangement,
            employmentType: prismaJob.employment_type,
            numberOfVacancies: prismaJob.number_of_vacancies,
            salaryMin: prismaJob.salary_min || undefined,
            salaryMax: prismaJob.salary_max || undefined,
            salaryCurrency: prismaJob.salary_currency,
            salaryDescription: prismaJob.salary_description || undefined,
            category: prismaJob.category || undefined,
            promotionalTags: prismaJob.promotional_tags || [],
            featured: prismaJob.featured,
            stealth: prismaJob.stealth,
            visibility: prismaJob.visibility,
            requirements: prismaJob.requirements || [],
            responsibilities: prismaJob.responsibilities || [],
            termsAccepted: prismaJob.terms_accepted,
            termsAcceptedAt: prismaJob.terms_accepted_at || undefined,
            termsAcceptedBy: prismaJob.terms_accepted_by || undefined,
            expiryDate: prismaJob.expires_at || undefined, // Fixed
            closeDate: prismaJob.close_date || undefined,
            postingDate: prismaJob.posting_date || undefined,
            hiringTeam: prismaJob.hiring_team || [],
            applicationForm: prismaJob.application_form || undefined,
            videoInterviewingEnabled: prismaJob.video_interviewing_enabled,
            assignmentMode: prismaJob.assignment_mode,
            regionId: prismaJob.region_id || undefined,
            servicePackage: prismaJob.service_package || undefined,
            paymentStatus: prismaJob.payment_status || undefined,
            assignedConsultantId: prismaJob.assigned_consultant_id || undefined,
            shareLink: prismaJob.share_link || undefined,
            referralLink: prismaJob.referral_link || undefined,
            alertsEnabled: prismaJob.alerts_enabled || undefined,
            createdAt: prismaJob.created_at,
            updatedAt: prismaJob.updated_at,
        };
    }
}
exports.JobRepository = JobRepository;
exports.jobRepository = new JobRepository();
