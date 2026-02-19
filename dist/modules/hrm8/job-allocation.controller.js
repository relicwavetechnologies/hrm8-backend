"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobAllocationController = void 0;
const controller_1 = require("../../core/controller");
const job_allocation_service_1 = require("./job-allocation.service");
const job_allocation_repository_1 = require("./job-allocation.repository");
class JobAllocationController extends controller_1.BaseController {
    constructor() {
        super('hrm8-job-allocation-controller');
        this.getJobDetail = async (req, res) => {
            try {
                const { jobId } = req.params;
                const result = await this.jobAllocationService.getJobDetail(jobId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.allocate = async (req, res) => {
            try {
                const { jobId, consultantId, source, assignmentSource, reason } = req.body;
                const result = await this.jobAllocationService.allocate({
                    jobId,
                    consultantId,
                    assignedBy: req.hrm8User?.id || 'unknown',
                    assignedByName: req.hrm8User
                        ? `${req.hrm8User.firstName} ${req.hrm8User.lastName}`.trim()
                        : 'HRM8 admin',
                    reason,
                    source: source || assignmentSource,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.assignConsultant = async (req, res) => {
            try {
                const { jobId } = req.params;
                const { consultantId, source, assignmentSource, reason } = req.body;
                this.logger.info('[HRM8][JobAllocation] assignConsultant request', {
                    userId: req.hrm8User?.id,
                    jobId,
                    consultantId,
                    source: source || assignmentSource,
                    reason,
                });
                const result = await this.jobAllocationService.allocate({
                    jobId: jobId,
                    consultantId: consultantId,
                    assignedBy: req.hrm8User?.id || 'unknown',
                    assignedByName: req.hrm8User
                        ? `${req.hrm8User.firstName} ${req.hrm8User.lastName}`.trim()
                        : 'HRM8 admin',
                    reason: reason,
                    source: source || assignmentSource,
                });
                this.logger.info('[HRM8][JobAllocation] assignConsultant response', {
                    userId: req.hrm8User?.id,
                    jobId,
                    consultantId,
                    success: true,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.assignRegion = async (req, res) => {
            try {
                const { jobId } = req.params;
                const { regionId } = req.body;
                const result = await this.jobAllocationService.assignRegion(jobId, regionId, req.hrm8User?.id || 'unknown');
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.unassign = async (req, res) => {
            try {
                const { jobId } = req.params;
                await this.jobAllocationService.unassign(jobId);
                return this.sendSuccess(res, { message: 'Job unassigned successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deallocate = async (req, res) => {
            try {
                const { id } = req.params; // id is jobId here or assignmentId? 
                // Based on admin_routes.md: DELETE /api/hrm8/job-allocation/{id}
                await this.jobAllocationService.unassign(id);
                return this.sendSuccess(res, { message: 'Job deallocated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobConsultants = async (req, res) => {
            try {
                const { jobId } = req.params;
                const result = await this.jobAllocationService.getJobConsultants(jobId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobsForAllocation = async (req, res) => {
            try {
                const { limit, offset, ...otherFilters } = req.query;
                const cleanedFilters = { ...otherFilters };
                // Sanitize filters: remove 'ALL', 'all', or empty string values
                Object.keys(cleanedFilters).forEach(key => {
                    if (cleanedFilters[key] === 'ALL' || cleanedFilters[key] === 'all' || cleanedFilters[key] === '') {
                        delete cleanedFilters[key];
                    }
                });
                const filters = {
                    ...cleanedFilters,
                    limit: limit ? parseInt(limit) : 10,
                    offset: offset ? parseInt(offset) : 0
                };
                this.logger.info('[HRM8][JobAllocation] getJobsForAllocation request', {
                    userId: req.hrm8User?.id,
                    filters,
                });
                const result = await this.jobAllocationService.getJobsForAllocation(filters);
                this.logger.info('[HRM8][JobAllocation] getJobsForAllocation response', {
                    userId: req.hrm8User?.id,
                    total: result.total,
                    returned: result.jobs?.length ?? 0,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAssignmentInfo = async (req, res) => {
            try {
                const { jobId } = req.params;
                this.logger.info('[HRM8][JobAllocation] getAssignmentInfo request', {
                    userId: req.hrm8User?.id,
                    jobId,
                });
                const result = await this.jobAllocationService.getAssignmentInfo(jobId);
                this.logger.info('[HRM8][JobAllocation] getAssignmentInfo response', {
                    userId: req.hrm8User?.id,
                    jobId,
                    hasJob: Boolean(result?.job),
                    regionId: result?.job?.regionId,
                    consultantsCount: result?.consultants?.length ?? 0,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStats = async (req, res) => {
            try {
                const result = await this.jobAllocationService.getStats();
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getByLicensee = async (req, res) => {
            try {
                const { id } = req.params; // licenseeId
                // This is slightly different, might need a service method
                // For now, filtering jobs for allocation by licensee if we can map regions
                const result = await this.jobAllocationService.getJobsForAllocation({ ...req.query, licenseeId: id });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.autoAssign = async (req, res) => {
            try {
                const { jobId } = req.params;
                const { reason } = req.body || {};
                this.logger.info('[HRM8][JobAllocation] autoAssign request', {
                    userId: req.hrm8User?.id,
                    jobId,
                    reason,
                });
                const result = await this.jobAllocationService.autoAssignJob(jobId, {
                    assignedBy: req.hrm8User?.id || 'system',
                    assignedByName: req.hrm8User
                        ? `${req.hrm8User.firstName} ${req.hrm8User.lastName}`.trim()
                        : 'HRM8 admin',
                    reason: reason,
                });
                this.logger.info('[HRM8][JobAllocation] autoAssign response', {
                    userId: req.hrm8User?.id,
                    jobId,
                    consultantId: result?.consultantId,
                    success: true,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getConsultantsForAssignment = async (req, res) => {
            try {
                const { regionId, role, availability, industry, language, search, limit, offset } = req.query;
                this.logger.info('[HRM8][JobAllocation] getConsultantsForAssignment request', {
                    userId: req.hrm8User?.id,
                    regionId,
                    role,
                    availability,
                    industry,
                    language,
                    search,
                    limit,
                    offset,
                });
                if (!regionId)
                    return this.sendError(res, new Error('Region ID is required'), 400);
                const result = await this.jobAllocationService.getConsultantsForAssignment({
                    regionId: regionId,
                    role: role,
                    availability: availability,
                    industry: industry,
                    language: language,
                    search: search,
                    limit: limit ? parseInt(limit, 10) : undefined,
                    offset: offset ? parseInt(offset, 10) : undefined,
                });
                this.logger.info('[HRM8][JobAllocation] getConsultantsForAssignment response', {
                    userId: req.hrm8User?.id,
                    regionId,
                    search,
                    total: result.total,
                    consultantsCount: result.consultants.length,
                    hasMore: result.hasMore,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.jobAllocationService = new job_allocation_service_1.JobAllocationService(new job_allocation_repository_1.JobAllocationRepository());
    }
}
exports.JobAllocationController = JobAllocationController;
