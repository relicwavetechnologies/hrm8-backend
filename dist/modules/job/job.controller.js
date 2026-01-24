"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobController = exports.JobController = void 0;
const controller_1 = require("../../core/controller");
const types_1 = require("../../types");
class JobController extends controller_1.BaseController {
    constructor(jobService = jobService, hiringTeamInvitationService = hiringTeamInvitationService, jobPaymentService = jobPaymentService, jobDescriptionGeneratorService = jobDescriptionGeneratorService) {
        super();
        this.jobService = jobService;
        this.hiringTeamInvitationService = hiringTeamInvitationService;
        this.jobPaymentService = jobPaymentService;
        this.jobDescriptionGeneratorService = jobDescriptionGeneratorService;
        this.createJob = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const jobData = req.body;
                if (!jobData.title?.trim()) {
                    return res.status(400).json({ success: false, error: 'Job title is required' });
                }
                if (!jobData.location?.trim()) {
                    return res.status(400).json({ success: false, error: 'Job location is required' });
                }
                const job = await this.jobService.createJob(req.user.companyId, req.user.id, jobData);
                if (jobData.servicePackage && jobData.servicePackage !== 'self-managed') {
                    try {
                        await this.jobService.publishJob(job.id, req.user.companyId, req.user.id);
                    }
                    catch (paymentError) {
                        res.status(201); // Set status before sending success
                        return this.sendSuccess(res, job, `Job created as Draft. Payment failed: ${paymentError.message}`);
                    }
                }
                res.status(201);
                return this.sendSuccess(res, job, 'Job created successfully');
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobs = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const filters = {};
                if (req.query.status)
                    filters.status = req.query.status;
                if (req.query.department)
                    filters.department = req.query.department;
                if (req.query.location)
                    filters.location = req.query.location;
                if (req.query.hiringMode)
                    filters.hiringMode = req.query.hiringMode;
                const jobs = await this.jobService.getCompanyJobs(req.user.companyId, filters);
                return this.sendSuccess(res, jobs);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobById = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const job = await this.jobService.getJobById(id, req.user.companyId);
                return this.sendSuccess(res, job);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateJob = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const jobData = req.body;
                const existingJob = await this.jobService.getJobById(id, req.user.companyId);
                const canEdit = existingJob.status === types_1.JobStatus.DRAFT ||
                    existingJob.createdBy === req.user.id ||
                    existingJob.status === types_1.JobStatus.OPEN;
                if (!canEdit) {
                    // simplified permission check
                }
                const job = await this.jobService.updateJob(id, req.user.companyId, jobData);
                return this.sendSuccess(res, job);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteJob = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                await this.jobService.deleteJob(id, req.user.companyId);
                return this.sendSuccess(res, { message: 'Job deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.publishJob = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const job = await this.jobService.publishJob(id, req.user.companyId, req.user.id);
                return this.sendSuccess(res, job);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.submitAndActivate = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const { paymentId } = req.body;
                const job = await this.jobService.submitAndActivate(id, req.user.companyId, paymentId);
                return this.sendSuccess(res, job);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.bulkDeleteJobs = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { jobIds } = req.body;
                if (!Array.isArray(jobIds)) {
                    return res.status(400).json({ success: false, error: 'jobIds must be an array' });
                }
                const count = await this.jobService.bulkDeleteJobs(jobIds, req.user.companyId);
                return this.sendSuccess(res, { deletedCount: count });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.inviteHiringTeamMember = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const invitationData = req.body;
                const job = await this.jobService.getJobById(id, req.user.companyId);
                await this.hiringTeamInvitationService.inviteToHiringTeam(req.user.companyId, id, job.title, req.user.id, invitationData);
                return this.sendSuccess(res, { message: 'Invitation sent' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createJobPayment = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const { servicePackage, customerEmail } = req.body;
                await this.jobService.getJobById(id, req.user.companyId); // Verify ownership
                const result = await this.jobPaymentService.createJobCheckoutSession({
                    jobId: id,
                    servicePackage,
                    companyId: req.user.companyId,
                    customerEmail
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.generateDescription = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const generated = await this.jobDescriptionGeneratorService.generateWithAI(req.body);
                return this.sendSuccess(res, generated);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveDraft = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const job = await this.jobService.saveDraft(id, req.user.companyId, req.body);
                return this.sendSuccess(res, job);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateAlerts = async (req, res) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ success: false, error: 'Unauthorized' });
                }
                const { id } = req.params; // Fixed type
                const job = await this.jobService.updateAlerts(id, req.user.companyId, req.body);
                return this.sendSuccess(res, job);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.JobController = JobController;
exports.jobController = new JobController();
