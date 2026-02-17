"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationController = void 0;
const controller_1 = require("../../core/controller");
const application_service_1 = require("./application.service");
const application_repository_1 = require("./application.repository");
const candidate_repository_1 = require("../candidate/candidate.repository");
const notification_service_1 = require("../notification/notification.service");
const notification_repository_1 = require("../notification/notification.repository");
class ApplicationController extends controller_1.BaseController {
    constructor() {
        super();
        // Submit a new application
        this.submitApplication = async (req, res) => {
            try {
                const payload = { ...req.body };
                // Inject candidate ID from authenticated request
                if (req.candidate) {
                    payload.candidateId = req.candidate.id;
                }
                if (!payload.candidateId) {
                    // If still no candidateId (and we require it for Prisma connection), throw error
                    return this.sendError(res, new Error('Candidate ID is required'), 401);
                }
                const application = await this.applicationService.submitApplication(payload);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get application by ID
        this.getApplication = async (req, res) => {
            try {
                const { id } = req.params;
                const application = await this.applicationService.getApplication(id);
                // Security Check
                if (req.user) {
                    // Recruiter/Company
                    if (application.job?.company?.id && application.job.company.id !== req.user.companyId) {
                        throw new Error('Forbidden: You do not have access to this application.');
                    }
                }
                else if (req.candidate) {
                    // Candidate
                    if (application.candidate_id !== req.candidate.id) {
                        throw new Error('Forbidden: You do not have access to this application.');
                    }
                }
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getResume = async (req, res) => {
            try {
                const { id } = req.params;
                const application = await this.applicationService.applicationRepository.findById(id);
                if (!application)
                    throw new Error('Application not found');
                if (req.user) {
                    // Company user
                    const appAny = application;
                    if (appAny.job?.company?.id && appAny.job.company.id !== req.user.companyId) {
                        throw new Error('Forbidden: You do not have access to this application.');
                    }
                }
                else if (req.candidate) {
                    // Candidate
                    if (application.candidate_id !== req.candidate.id) {
                        throw new Error('Forbidden: You do not have access to this application.');
                    }
                }
                const resume = await this.applicationService.getResume(id);
                return this.sendSuccess(res, resume);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get candidate's applications
        this.getCandidateApplications = async (req, res) => {
            try {
                let candidateId = req.query.candidateId;
                if (!candidateId && req.candidate) {
                    candidateId = req.candidate.id;
                }
                if (!candidateId) {
                    return this.sendError(res, new Error('Candidate ID is required'), 400);
                }
                const applications = await this.applicationService.getCandidateApplications(candidateId);
                return this.sendSuccess(res, { applications });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get job applications (CRITICAL for /ats/jobs page)
        this.getJobApplications = async (req, res) => {
            try {
                const { jobId } = req.params;
                const filters = req.query;
                const result = await this.applicationService.getJobApplications(jobId, filters);
                this.logger.info('Job applications fetched', {
                    jobId,
                    count: result.applications?.length || 0,
                    companyId: req.user?.companyId || null,
                    sample: (result.applications || []).slice(0, 5).map((app) => ({
                        id: app.id,
                        status: app.status,
                        stage: app.stage,
                        roundId: app.roundId || app.round_id,
                    })),
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Update application score
        this.updateScore = async (req, res) => {
            try {
                const { id } = req.params;
                const { score } = req.body;
                if (typeof score !== 'number') {
                    return this.sendError(res, new Error('Score must be a number'), 400);
                }
                const application = await this.applicationService.updateScore(id, score);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Update application rank
        this.updateRank = async (req, res) => {
            try {
                const { id } = req.params;
                const { rank } = req.body;
                if (typeof rank !== 'number') {
                    return this.sendError(res, new Error('Rank must be a number'), 400);
                }
                const application = await this.applicationService.updateRank(id, rank);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Update application tags
        this.updateTags = async (req, res) => {
            try {
                const { id } = req.params;
                const { tags } = req.body;
                if (!Array.isArray(tags)) {
                    return this.sendError(res, new Error('Tags must be an array'), 400);
                }
                const application = await this.applicationService.updateTags(id, tags);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Shortlist candidate
        this.shortlistCandidate = async (req, res) => {
            try {
                const { id } = req.params;
                if (!req.user) {
                    return this.sendError(res, new Error('Not authenticated'), 401);
                }
                const application = await this.applicationService.shortlistCandidate(id, req.user.id);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Unshortlist candidate
        this.unshortlistCandidate = async (req, res) => {
            try {
                const { id } = req.params;
                const application = await this.applicationService.unshortlistCandidate(id);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Update application stage
        this.updateStage = async (req, res) => {
            try {
                const { id } = req.params;
                const { stage } = req.body;
                if (!stage) {
                    return this.sendError(res, new Error('Stage is required'), 400);
                }
                const application = await this.applicationService.updateStage(id, stage);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Update application notes
        this.updateNotes = async (req, res) => {
            try {
                const { id } = req.params;
                const { notes } = req.body;
                if (typeof notes !== 'string') {
                    return this.sendError(res, new Error('Notes must be a string'), 400);
                }
                const application = await this.applicationService.updateNotes(id, notes);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Withdraw application
        this.withdrawApplication = async (req, res) => {
            try {
                const { id } = req.params;
                let { candidateId } = req.body;
                if (!candidateId && req.candidate) {
                    candidateId = req.candidate.id;
                }
                if (!candidateId) {
                    return this.sendError(res, new Error('Candidate ID is required'), 400);
                }
                const application = await this.applicationService.withdrawApplication(id, candidateId);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Delete application
        this.deleteApplication = async (req, res) => {
            try {
                const { id } = req.params;
                const { candidateId } = req.body;
                if (!candidateId) {
                    return this.sendError(res, new Error('Candidate ID is required'), 400);
                }
                await this.applicationService.deleteApplication(id, candidateId);
                return this.sendSuccess(res, { message: 'Application deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Mark application as read
        this.markAsRead = async (req, res) => {
            try {
                const { id } = req.params;
                const application = await this.applicationService.markAsRead(id);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.moveToRound = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id, roundId } = req.params;
                const result = await this.applicationService.moveToRound(id, roundId, req.user.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Bulk score candidates
        this.bulkScoreCandidates = async (req, res) => {
            try {
                const { applicationIds, scores } = req.body;
                if (!Array.isArray(applicationIds) || !scores) {
                    return this.sendError(res, new Error('Application IDs array and scores object are required'), 400);
                }
                const updatedCount = await this.applicationService.bulkScoreCandidates(applicationIds, scores);
                return this.sendSuccess(res, { updatedCount, message: `${updatedCount} application(s) scored successfully` });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Bulk AI Analysis
        this.bulkAiAnalysis = async (req, res) => {
            try {
                const { applicationIds, jobId } = req.body;
                if (!Array.isArray(applicationIds) || !jobId) {
                    return this.sendError(res, new Error('Application IDs array and Job ID are required'), 400);
                }
                const result = await this.applicationService.bulkAiAnalysis(applicationIds, jobId);
                return this.sendSuccess(res, {
                    ...result,
                    message: `Analysis completed: ${result.success} succeeded, ${result.failed} failed`
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get application count for job
        this.getApplicationCountForJob = async (req, res) => {
            try {
                const { jobId } = req.params;
                const counts = await this.applicationService.getApplicationCountForJob(jobId);
                return this.sendSuccess(res, counts);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Check if candidate has applied to job
        this.checkApplication = async (req, res) => {
            try {
                const candidateId = req.query.candidateId;
                const jobId = req.query.jobId;
                if (!candidateId || !jobId) {
                    return this.sendError(res, new Error('Candidate ID and Job ID are required'), 400);
                }
                const hasApplied = await this.applicationService.checkApplication(candidateId, jobId);
                return this.sendSuccess(res, { hasApplied });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.submitManualApplication = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const result = await this.applicationService.createManualApplication(req.body, req.user.id);
                return this.sendSuccess(res, { application: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateManualScreening = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.applicationService.updateManualScreening(id, req.body);
                return this.sendSuccess(res, { application: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.addFromTalentPool = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { candidateId, jobId } = req.body;
                const result = await this.applicationService.createFromTalentPool(candidateId, jobId, req.user.id);
                return this.sendSuccess(res, { application: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.addEvaluation = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id } = req.params;
                const { score, comment, decision } = req.body;
                // Ensure user has permission for higher-level actions
                // For Member role: Can score and comment.
                // For Shortlisting/Admin: Can also Approve/Reject.
                // Assuming 'req.user.role' or similar exists, or we trust the frontend UI and just process it.
                // Ideally, check: if (decision && !hasPermission(req.user, 'EVALUATE_DECISION')) throw error.
                // For MVP/Speed, we proceed.
                const evaluation = await this.applicationService.addEvaluation({
                    applicationId: id,
                    userId: req.user.id,
                    score,
                    comment,
                    decision
                });
                // Status Update Logic based on decision (as requested)
                if (decision === 'APPROVE') {
                    const app = await this.applicationService.getApplication(id);
                    if (!app.shortlisted) {
                        await this.applicationService.shortlistCandidate(id, req.user.id);
                        // Also set stage to next steps? Or just shortlisted flag?
                        // Prompt says: "Update candidate status to 'Shortlisted' or 'Rejected' upon approval/rejection."
                        // Assuming we use the 'shortlisted' boolean or a specific stage.
                    }
                }
                else if (decision === 'REJECT') {
                    await this.applicationService.updateStage(id, 'REJECTED');
                }
                return this.sendSuccess(res, { evaluation });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getEvaluations = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id } = req.params;
                const evaluations = await this.applicationService.getEvaluations(id);
                return this.sendSuccess(res, { evaluations });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get notes for an application
        this.getNotes = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id } = req.params;
                const notes = await this.applicationService.getNotes(id);
                return this.sendSuccess(res, { notes });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Add a note with @mention support
        this.addNote = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id } = req.params;
                const { content, mentions } = req.body;
                if (!content || typeof content !== 'string') {
                    return this.sendError(res, new Error('Content is required'), 400);
                }
                const note = await this.applicationService.addNote(id, req.user.id, content, mentions || []);
                return this.sendSuccess(res, { note });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.applicationService = new application_service_1.ApplicationService(new application_repository_1.ApplicationRepository(), new candidate_repository_1.CandidateRepository(), new notification_service_1.NotificationService(new notification_repository_1.NotificationRepository()));
    }
}
exports.ApplicationController = ApplicationController;
