"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobController = void 0;
const controller_1 = require("../../core/controller");
const job_service_1 = require("./job.service");
const job_repository_1 = require("./job.repository");
const application_repository_1 = require("../application/application.repository");
const notification_repository_1 = require("../notification/notification.repository");
const notification_service_1 = require("../notification/notification.service");
const job_round_service_1 = require("./job-round.service");
const job_round_repository_1 = require("./job-round.repository");
const assessment_service_1 = require("../assessment/assessment.service");
const assessment_repository_1 = require("../assessment/assessment.repository");
const job_description_generator_service_1 = require("../ai/job-description-generator.service");
class JobController extends controller_1.BaseController {
    constructor() {
        super();
        this.createJob = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const job = await this.jobService.createJob(req.user.companyId, req.user.id, req.body);
                // Initialize rounds for new job based on setup type
                if (job.setup_type === 'SIMPLE' || (req.body.setupType && req.body.setupType.toLowerCase() === 'simple')) {
                    await this.jobRoundService.initializeSimpleRounds(job.id);
                }
                else {
                    await this.jobRoundService.initializeFixedRounds(job.id);
                }
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobs = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const jobs = await this.jobService.getCompanyJobs(req.user.companyId, req.query);
                return this.sendSuccess(res, { jobs });
            }
            catch (error) {
                console.error('[JobController] getJobs error:', error);
                return this.sendError(res, error);
            }
        };
        this.getJob = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const job = await this.jobService.getJob(id, req.user.companyId);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateJob = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const job = await this.jobService.updateJob(id, req.user.companyId, req.body);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteJob = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                await this.jobService.deleteJob(id, req.user.companyId);
                return this.sendSuccess(res, { message: 'Job deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.bulkDeleteJobs = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { jobIds } = req.body;
                if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
                    return this.sendError(res, new Error('Job IDs array is required'), 400);
                }
                const deletedCount = await this.jobService.bulkDeleteJobs(jobIds, req.user.companyId);
                return this.sendSuccess(res, {
                    deletedCount,
                    message: `${deletedCount} job(s) deleted successfully`
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.publishJob = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const { saveAsTemplate, templateName } = req.body;
                const job = await this.jobService.publishJob(id, req.user.companyId, req.user.id, { saveAsTemplate, templateName });
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveDraft = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const job = await this.jobService.saveDraft(id, req.user.companyId, req.body);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveTemplate = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const { templateName, templateDescription } = req.body;
                const result = await this.jobService.saveAsTemplate(id, req.user.companyId, templateName || 'Job Template', templateDescription);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Submit and activate a job (final step of job wizard)
         * POST /api/jobs/:id/submit
         */
        this.submitAndActivate = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const { paymentId } = req.body;
                const job = await this.jobService.submitAndActivate(id, req.user.companyId, req.user.id, paymentId);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Update job alerts configuration
         * PUT /api/jobs/:id/alerts
         */
        this.updateAlerts = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const job = await this.jobService.updateAlerts(id, req.user.companyId, req.body);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Save job as a named template
         * POST /api/jobs/:id/save-as-template
         */
        this.saveAsTemplate = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const { templateName, templateDescription } = req.body;
                if (!templateName) {
                    return this.sendError(res, new Error('Template name is required'), 400);
                }
                const result = await this.jobService.saveAsTemplate(id, req.user.companyId, templateName, templateDescription);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Archive a job
         * POST /api/jobs/:id/archive
         */
        this.archiveJob = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const job = await this.jobService.archiveJob(id, req.user.companyId, req.user.id);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Unarchive a job
         * POST /api/jobs/:id/unarchive
         */
        this.unarchiveJob = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const job = await this.jobService.unarchiveJob(id, req.user.companyId);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Bulk archive jobs
         * POST /api/jobs/bulk-archive
         */
        this.bulkArchiveJobs = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { jobIds } = req.body;
                if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
                    return this.sendError(res, new Error('Job IDs array is required'), 400);
                }
                const archivedCount = await this.jobService.bulkArchiveJobs(jobIds, req.user.companyId, req.user.id);
                return this.sendSuccess(res, {
                    archivedCount,
                    message: `${archivedCount} job(s) archived successfully`
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Bulk unarchive jobs
         * POST /api/jobs/bulk-unarchive
         */
        this.bulkUnarchiveJobs = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { jobIds } = req.body;
                if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
                    return this.sendError(res, new Error('Job IDs array is required'), 400);
                }
                const unarchivedCount = await this.jobService.bulkUnarchiveJobs(jobIds, req.user.companyId);
                return this.sendSuccess(res, {
                    unarchivedCount,
                    message: `${unarchivedCount} job(s) unarchived successfully`
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Job Round Methods
        this.getJobRounds = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
                const result = await this.jobRoundService.getJobRounds(resolvedJobId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createJobRound = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
                const result = await this.jobRoundService.createRound(resolvedJobId, req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateJobRound = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, roundId } = req.params;
                const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
                const result = await this.jobRoundService.updateRound(resolvedJobId, roundId, req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteJobRound = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, roundId } = req.params;
                const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
                const result = await this.jobRoundService.deleteRound(resolvedJobId, roundId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Interview Configuration Methods
        this.getInterviewConfig = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, roundId } = req.params;
                await this.jobService.resolveJobId(id, req.user.companyId);
                const config = await this.jobRoundService.getInterviewConfig(roundId);
                return this.sendSuccess(res, { config: config || null });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.configureInterview = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, roundId } = req.params;
                await this.jobService.resolveJobId(id, req.user.companyId);
                await this.jobRoundService.saveInterviewConfig(roundId, req.body);
                return this.sendSuccess(res, { message: 'Interview configuration saved successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Assessment Configuration Methods
        this.getAssessmentConfig = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, roundId } = req.params;
                await this.jobService.resolveJobId(id, req.user.companyId);
                const config = await this.jobRoundService.getAssessmentConfig(roundId);
                return this.sendSuccess(res, { config: config || null });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.configureAssessment = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, roundId } = req.params;
                await this.jobService.resolveJobId(id, req.user.companyId);
                await this.jobRoundService.saveAssessmentConfig(roundId, req.body);
                return this.sendSuccess(res, { message: 'Assessment configuration saved successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRoundAssessments = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, roundId } = req.params;
                await this.jobService.resolveJobId(id, req.user.companyId);
                const assessments = await this.assessmentService.getRoundAssessments(roundId);
                return this.sendSuccess(res, assessments);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.inviteHiringTeamMember = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const { email, name, role, permissions } = req.body;
                if (!email || !role) {
                    return this.sendError(res, new Error('Email and role are required'), 400);
                }
                // Verify job access
                await this.jobService.getJob(id, req.user.companyId);
                await this.jobService.inviteTeamMember(id, req.user.companyId, {
                    email,
                    name,
                    role,
                    permissions,
                    roles: req.body.roles,
                    inviterId: req.user.id,
                });
                return this.sendSuccess(res, { message: 'Invitation sent successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobRoles = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
                const roles = await this.jobService.getJobRoles(resolvedJobId, req.user.companyId);
                return this.sendSuccess(res, { roles });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createJobRole = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const resolvedJobId = await this.jobService.resolveJobId(id, req.user.companyId);
                const role = await this.jobService.createJobRole(resolvedJobId, req.user.companyId, req.body);
                return this.sendSuccess(res, { role });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getHiringTeam = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const members = await this.jobService.getTeamMembers(id, req.user.companyId);
                return this.sendSuccess(res, members);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateHiringTeamMemberRole = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, memberId } = req.params;
                const { role, roles: roleIds } = req.body;
                if (Array.isArray(roleIds)) {
                    await this.jobService.updateTeamMemberRoles(id, memberId, req.user.companyId, roleIds);
                }
                else if (role != null) {
                    await this.jobService.updateTeamMemberRole(id, memberId, req.user.companyId, role);
                }
                else {
                    return this.sendError(res, new Error('role or roles is required'), 400);
                }
                return this.sendSuccess(res, { message: 'Role updated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.removeHiringTeamMember = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, memberId } = req.params;
                await this.jobService.removeTeamMember(id, memberId, req.user.companyId);
                return this.sendSuccess(res, { message: 'Member removed successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.resendHiringTeamInvite = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id, memberId } = req.params;
                await this.jobService.resendInvite(id, memberId, req.user.companyId, req.user.id);
                return this.sendSuccess(res, { message: 'Invitation resent successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Generate job description using AI
         * POST /api/jobs/generate-description
         */
        this.generateDescription = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const requestData = req.body;
                if (!requestData.title) {
                    return this.sendError(res, new Error('Job title is required'), 400);
                }
                const generated = await job_description_generator_service_1.jobDescriptionGeneratorService.generateWithAI(requestData);
                return this.sendSuccess(res, generated);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.jobRoundService = new job_round_service_1.JobRoundService(new job_round_repository_1.JobRoundRepository(), new job_repository_1.JobRepository());
        this.jobService = new job_service_1.JobService(new job_repository_1.JobRepository(), new application_repository_1.ApplicationRepository(), new notification_service_1.NotificationService(new notification_repository_1.NotificationRepository()), this.jobRoundService);
        this.assessmentService = new assessment_service_1.AssessmentService(new assessment_repository_1.AssessmentRepository());
    }
}
exports.JobController = JobController;
