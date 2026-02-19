"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobAllocationService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
const logger_1 = require("../../utils/logger");
class JobAllocationService extends service_1.BaseService {
    constructor(jobAllocationRepository) {
        super();
        this.jobAllocationRepository = jobAllocationRepository;
        this.logger = logger_1.Logger.create('hrm8-job-allocation-service');
    }
    async allocate(data) {
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: data.consultantId },
            select: { region_id: true },
        });
        if (!consultant || !consultant.region_id) {
            throw new http_exception_1.HttpException(404, 'Consultant not found or not assigned to a region');
        }
        return this.jobAllocationRepository.assignToConsultant({
            ...data,
            regionId: consultant.region_id,
        });
    }
    async assignRegion(jobId, regionId, assignedBy) {
        const consultant = await prisma_1.prisma.consultant.findFirst({
            where: { region_id: regionId, status: 'ACTIVE' },
        });
        if (!consultant) {
            throw new http_exception_1.HttpException(404, 'No active consultant found in this region');
        }
        return this.jobAllocationRepository.assignToConsultant({
            jobId,
            consultantId: consultant.id,
            assignedBy,
            regionId,
            source: client_1.AssignmentSource.MANUAL_HRM8,
        });
    }
    async unassign(jobId) {
        return this.jobAllocationRepository.unassign(jobId);
    }
    async getJobConsultants(jobId) {
        const assignments = await this.jobAllocationRepository.findConsultantsByJob(jobId);
        return assignments.map(a => ({
            id: a.consultant.id,
            firstName: a.consultant.first_name,
            lastName: a.consultant.last_name,
            email: a.consultant.email,
        }));
    }
    async getJobsForAllocation(filters) {
        const { limit = 10, offset = 0, search, regionId, assignmentStatus, companyId, company, industry } = filters;
        this.logger.info('[HRM8][JobAllocation] Loading jobs for allocation', {
            limit,
            offset,
            search,
            regionId,
            assignmentStatus,
            companyId,
            company,
            industry,
        });
        const where = {
            status: { in: ['OPEN', 'ON_HOLD'] },
        };
        if (assignmentStatus && assignmentStatus !== 'ALL') {
            if (assignmentStatus === 'UNASSIGNED') {
                where.assigned_consultant_id = null;
            }
            else if (assignmentStatus === 'ASSIGNED') {
                where.assigned_consultant_id = { not: null };
            }
            else if (['OPEN', 'ON_HOLD', 'CLOSED', 'FILLED', 'DRAFT', 'CANCELLED', 'EXPIRED'].includes(assignmentStatus)) {
                where.status = assignmentStatus;
            }
        }
        if (regionId && regionId !== 'all') {
            where.region_id = regionId;
        }
        if (companyId) {
            where.company_id = companyId;
        }
        else if (company) {
            where.company = {
                name: { contains: company, mode: 'insensitive' }
            };
        }
        if (industry) {
            where.category = { contains: industry, mode: 'insensitive' };
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { company: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [jobs, total] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: {
                    assigned_consultant: {
                        select: { id: true, first_name: true, last_name: true, email: true }
                    },
                    company: {
                        select: { id: true, name: true, region_id: true }
                    },
                    region: {
                        select: { name: true }
                    }
                }
            }),
            prisma_1.prisma.job.count({ where }),
        ]);
        this.logger.info('[HRM8][JobAllocation] Loaded jobs for allocation', {
            total,
            returned: jobs.length,
        });
        return { jobs: jobs.map(this.mapToDTO), total };
    }
    mapToDTO(job) {
        return {
            id: job.id,
            title: job.title,
            location: job.location,
            category: job.category,
            status: job.status,
            assignmentMode: job.assignment_mode,
            assignmentSource: job.assignment_source,
            companyId: job.company?.id || job.company_id,
            companyName: job.company?.name,
            regionId: job.region_id || job.company?.region_id,
            createdAt: job.created_at,
            postedAt: job.posted_at,
            assignedConsultantId: job.assigned_consultant?.id || job.assigned_consultant_id,
            assignedConsultantName: job.assigned_consultant
                ? `${job.assigned_consultant.first_name} ${job.assigned_consultant.last_name}`
                : null,
            assignedRegion: job.region ? job.region.name : 'Unassigned',
        };
    }
    async getStats() {
        return this.jobAllocationRepository.getStats();
    }
    async getConsultantsForAssignment(filters) {
        const { regionId, role, availability, industry, language, search, limit = 25, offset = 0 } = filters;
        this.logger.info('[HRM8][JobAllocation] Loading consultants for assignment', {
            regionId,
            role,
            availability,
            industry,
            language,
            search,
            limit,
            offset,
        });
        const where = {
            status: 'ACTIVE',
        };
        if (regionId && regionId !== 'all') {
            where.region_id = regionId;
        }
        if (search) {
            where.OR = [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const normalizedRole = role?.trim().toUpperCase().replace(/[-\s]/g, '_');
        if (normalizedRole) {
            where.role = normalizedRole;
        }
        const normalizedAvailability = availability?.trim().toUpperCase().replace(/[-\s]/g, '_');
        if (normalizedAvailability && normalizedAvailability !== 'ALL') {
            where.availability = normalizedAvailability;
        }
        if (industry?.trim()) {
            where.industry_expertise = {
                has: industry.trim(),
            };
        }
        const [consultants, total] = await Promise.all([
            prisma_1.prisma.consultant.findMany({
                where,
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true,
                    status: true,
                    current_jobs: true,
                    max_jobs: true,
                    availability: true,
                },
                orderBy: [
                    { current_jobs: 'asc' },
                    { max_jobs: 'asc' },
                    { first_name: 'asc' },
                ],
            }),
            prisma_1.prisma.consultant.count({ where }),
        ]);
        this.logger.info('[HRM8][JobAllocation] Loaded consultants for assignment', {
            regionId,
            role: normalizedRole,
            availability: normalizedAvailability,
            search,
            limit,
            offset,
            total,
            consultantsCount: consultants.length,
        });
        const mappedConsultants = consultants.map(c => ({
            id: c.id,
            firstName: c.first_name,
            lastName: c.last_name,
            email: c.email,
            role: c.role || 'CONSULTANT',
            status: c.status,
            availability: c.availability || (c.max_jobs > 0 && c.current_jobs >= c.max_jobs ? 'AT_CAPACITY' : 'AVAILABLE'),
            currentJobs: c.current_jobs,
            maxJobs: c.max_jobs
        }));
        return {
            consultants: mappedConsultants,
            total,
            hasMore: offset + mappedConsultants.length < total,
            offset,
            limit,
        };
    }
    async autoAssignJob(jobId, options) {
        this.logger.info('[HRM8][JobAllocation] Auto-assign started', { jobId });
        const job = await prisma_1.prisma.job.findUnique({
            where: { id: jobId },
            include: { company: true }
        });
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        const regionId = job.region_id || job.company?.region_id;
        this.logger.info('[HRM8][JobAllocation] Auto-assign region resolved', {
            jobId,
            jobRegionId: job.region_id,
            companyRegionId: job.company?.region_id,
            resolvedRegionId: regionId,
        });
        if (!regionId)
            throw new http_exception_1.HttpException(400, 'Job (and its Company) has no region assigned');
        const bestConsultant = await prisma_1.prisma.consultant.findFirst({
            where: { region_id: regionId, status: 'ACTIVE' },
            orderBy: { current_jobs: 'asc' },
        });
        this.logger.info('[HRM8][JobAllocation] Auto-assign consultant lookup', {
            jobId,
            regionId,
            hasConsultant: Boolean(bestConsultant),
            consultantId: bestConsultant?.id,
        });
        if (!bestConsultant)
            throw new http_exception_1.HttpException(404, 'No suitable consultant for auto-assignment');
        const result = await this.allocate({
            jobId,
            consultantId: bestConsultant.id,
            assignedBy: options?.assignedBy || 'system',
            assignedByName: options?.assignedByName || 'HRM8 auto-assignment',
            reason: options?.reason,
            source: client_1.AssignmentSource.AUTO_RULES,
        });
        this.logger.info('[HRM8][JobAllocation] Auto-assign completed', {
            jobId,
            consultantId: bestConsultant.id,
        });
        return {
            consultantId: bestConsultant.id,
            assignment: result,
        };
    }
    async getJobDetail(jobId) {
        const job = await prisma_1.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                company: {
                    select: { id: true, name: true, region_id: true }
                },
                assigned_consultant: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                },
                region: {
                    select: { name: true }
                }
            }
        });
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        const jobDTO = {
            ...this.mapToDTO(job),
            hrm8Notes: '',
            hrm8Hidden: job.stealth,
            hrm8Status: job.status,
            description: job.description || '',
            location: job.location || '',
            status: job.status,
        };
        const analytics = {
            totalViews: job.views_count || 0,
            totalClicks: job.clicks_count || 0,
            totalApplications: 0,
            conversionRate: 0,
            viewsOverTime: [],
            sourceBreakdown: []
        };
        const activities = [];
        return { job: jobDTO, analytics, activities };
    }
    async getAssignmentInfo(jobId) {
        this.logger.info('[HRM8][JobAllocation] Loading assignment info', { jobId });
        const job = await prisma_1.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                company: {
                    select: { id: true, name: true, region_id: true }
                },
                assigned_consultant: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                }
            }
        });
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        const regionId = job.region_id || job.company?.region_id || undefined;
        this.logger.info('[HRM8][JobAllocation] Assignment info region resolved', {
            jobId,
            jobRegionId: job.region_id,
            companyRegionId: job.company?.region_id,
            resolvedRegionId: regionId,
        });
        const consultants = regionId
            ? await prisma_1.prisma.consultant.findMany({
                where: {
                    region_id: regionId,
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                },
                orderBy: { first_name: 'asc' },
            })
            : [];
        this.logger.info('[HRM8][JobAllocation] Assignment info consultants loaded', {
            jobId,
            resolvedRegionId: regionId,
            consultantsCount: consultants.length,
        });
        const pipeline = await this.getPipelineForJob(jobId);
        this.logger.info('[HRM8][JobAllocation] Assignment info pipeline loaded', {
            jobId,
            hasPipeline: Boolean(pipeline),
            stage: pipeline?.stage,
        });
        return {
            job: {
                id: job.id,
                title: job.title,
                assignedConsultantId: job.assigned_consultant?.id || job.assigned_consultant_id || undefined,
                assignmentSource: job.assignment_source || undefined,
                assignmentMode: job.assignment_mode || undefined,
                regionId,
            },
            consultants: consultants.map((consultant) => ({
                id: consultant.id,
                firstName: consultant.first_name,
                lastName: consultant.last_name,
                email: consultant.email,
            })),
            pipeline: pipeline
                ? {
                    stage: pipeline.stage,
                    progress: pipeline.progress,
                    note: pipeline.note,
                    updatedAt: pipeline.updatedAt,
                    updatedBy: pipeline.updatedBy,
                }
                : undefined,
        };
    }
    async getPipelineForJob(jobId, preferredConsultantId) {
        const assignment = await prisma_1.prisma.consultantJobAssignment.findFirst({
            where: {
                job_id: jobId,
                status: 'ACTIVE',
                ...(preferredConsultantId ? { consultant_id: preferredConsultantId } : {}),
            },
            orderBy: { assigned_at: 'desc' },
        });
        if (!assignment)
            return null;
        return {
            consultantId: assignment.consultant_id,
            jobId: assignment.job_id,
            stage: assignment.pipeline_stage,
            progress: assignment.pipeline_progress,
            note: assignment.pipeline_note,
            updatedAt: assignment.pipeline_updated_at,
            updatedBy: assignment.pipeline_updated_by,
        };
    }
    async getPipelineForConsultantJob(consultantId, jobId) {
        return this.getPipelineForJob(jobId, consultantId);
    }
    async updatePipelineForConsultantJob(consultantId, jobId, data) {
        const assignment = await prisma_1.prisma.consultantJobAssignment.findFirst({
            where: { consultant_id: consultantId, job_id: jobId, status: 'ACTIVE' },
        });
        if (!assignment)
            throw new http_exception_1.HttpException(404, 'Assignment not found');
        return prisma_1.prisma.consultantJobAssignment.update({
            where: { id: assignment.id },
            data: {
                pipeline_stage: data.stage,
                pipeline_progress: data.progress ?? assignment.pipeline_progress,
                pipeline_note: data.note ?? assignment.pipeline_note,
                pipeline_updated_at: new Date(),
                pipeline_updated_by: data.updatedBy || consultantId,
            },
        });
    }
}
exports.JobAllocationService = JobAllocationService;
