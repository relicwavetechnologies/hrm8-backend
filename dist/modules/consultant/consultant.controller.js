"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantController = void 0;
const controller_1 = require("../../core/controller");
const consultant_service_1 = require("./consultant.service");
const consultant_candidate_service_1 = require("./consultant-candidate.service");
const consultant_withdrawal_service_1 = require("./consultant-withdrawal.service");
const commission_service_1 = require("../hrm8/commission.service");
const commission_repository_1 = require("../hrm8/commission.repository");
const conversation_service_1 = require("../communication/conversation.service");
const session_1 = require("../../utils/session");
class ConsultantController extends controller_1.BaseController {
    constructor() {
        super();
        // ... existing methods ...
        // Auth
        this.login = async (req, res) => {
            try {
                const { email, password } = req.body;
                const { consultant, sessionId } = await this.consultantService.login({ email, password });
                res.cookie('consultantToken', sessionId, (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, {
                    consultant: {
                        id: consultant.id,
                        email: consultant.email,
                        firstName: consultant.first_name,
                        lastName: consultant.last_name,
                        role: consultant.role
                    }
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCurrentUser = async (req, res) => {
            try {
                // Middleware already validates and populates req.consultant
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'));
                // Optional: fetch fresh full profile if needed, but req.consultant is usually enough for "me"
                // Or call getProfile for full details
                const consultant = await this.consultantService.getProfile(req.consultant.id);
                return this.sendSuccess(res, { consultant });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Candidates & Pipeline
        this.getPipeline = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { jobId } = req.params;
                const result = await this.candidateService.getPipeline(consultantId, jobId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobRounds = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { jobId } = req.params;
                const result = await this.candidateService.getJobRounds(consultantId, jobId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateCandidateStatus = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { applicationId } = req.params;
                const { status, stage } = req.body;
                const result = await this.candidateService.updateStatus(consultantId, applicationId, status, stage);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.addCandidateNote = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { applicationId } = req.params;
                const { note } = req.body;
                await this.candidateService.addNote(consultantId, applicationId, note);
                return this.sendSuccess(res, { message: 'Note added' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.moveCandidateToRound = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { applicationId } = req.params;
                const { roundId } = req.body;
                await this.candidateService.moveToRound(consultantId, applicationId, roundId);
                return this.sendSuccess(res, { message: 'Moved to round' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateCandidateStage = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { applicationId } = req.params;
                const { stage } = req.body;
                const result = await this.candidateService.updateStage(consultantId, applicationId, stage);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Messaging
        this.listConversations = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.conversationService.listConversationsForParticipant(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getMessages = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { conversationId } = req.params;
                // Verify participation first? Service usually handles it or returns empty.
                // Deep verification recommended.
                const conversation = await this.conversationService.getConversation(conversationId);
                if (!conversation || !conversation.participants.some(p => p.participant_id === consultantId)) {
                    return this.sendError(res, new Error('Conversation not found or access denied'), 404);
                }
                const result = await this.conversationService.listMessages(conversationId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.sendMessage = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { conversationId } = req.params;
                const { content, contentType } = req.body;
                const result = await this.conversationService.createMessage({
                    conversationId: conversationId,
                    senderType: 'CONSULTANT',
                    senderId: consultantId,
                    senderEmail: req.consultant.email,
                    content,
                    contentType
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markMessagesRead = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { conversationId } = req.params;
                const count = await this.conversationService.markMessagesAsRead(conversationId, consultantId);
                return this.sendSuccess(res, { updated: count });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Withdrawals
        this.getWithdrawalBalance = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.withdrawalService.calculateBalance(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.requestWithdrawal = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.withdrawalService.requestWithdrawal(consultantId, req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getWithdrawals = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { status } = req.query;
                const result = await this.withdrawalService.getWithdrawals(consultantId, status);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.cancelWithdrawal = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { id } = req.params;
                const result = await this.withdrawalService.cancelWithdrawal(id, consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getProfile = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.consultantService.getProfile(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateProfile = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.consultantService.updateProfile(consultantId, req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobs = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                console.log(`[ConsultantController.getJobs] Request from consultantId: ${consultantId}`);
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { status } = req.query;
                console.log(`[ConsultantController.getJobs] Fetching jobs with status: ${status}`);
                const result = await this.consultantService.getAssignedJobs(consultantId, { status: status });
                console.log(`[ConsultantController.getJobs] Found ${result.length} jobs`);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                console.error('[ConsultantController.getJobs] Error:', error);
                return this.sendError(res, error);
            }
        };
        this.getJobDetails = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { jobId } = req.params;
                console.log(`[ConsultantController.getJobDetails] Request for jobId: "${jobId}" by consultant: ${consultantId}`);
                const result = await this.consultantService.getJobDetails(consultantId, jobId);
                console.log(`[ConsultantController.getJobDetails] Success`);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                console.error(`[ConsultantController.getJobDetails] Error:`, error);
                return this.sendError(res, error);
            }
        };
        this.submitShortlist = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { jobId } = req.params;
                const { candidateIds, notes } = req.body;
                await this.consultantService.submitShortlist(consultantId, jobId, candidateIds, notes);
                return this.sendSuccess(res, { message: 'Shortlist submitted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.flagJob = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                // TODO: Implement actual flag logic
                // const { jobId } = req.params;
                return this.sendSuccess(res, { message: 'Job flagged' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.logJobActivity = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { jobId } = req.params;
                const { activityType, notes } = req.body;
                await this.consultantService.logJobActivity(consultantId, jobId, activityType, notes);
                return this.sendSuccess(res, { message: 'Activity logged' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.requestCommission = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const commissionService = new commission_service_1.CommissionService(new commission_repository_1.CommissionRepository());
                const commission = await commissionService.requestCommission({
                    consultantId,
                    type: req.body.type,
                    amount: req.body.amount,
                    jobId: req.body.jobId,
                    subscriptionId: req.body.subscriptionId,
                    description: req.body.description,
                    calculateFromJob: req.body.calculateFromJob,
                    rate: req.body.rate,
                });
                return this.sendSuccess(res, { commission });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCommissions = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.consultantService.getCommissions(consultantId, req.query);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getPerformance = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.consultantService.getPerformanceMetrics(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getDashboardAnalytics = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.consultantService.getDashboardAnalytics(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.logout = async (req, res) => {
            try {
                const sessionId = req.cookies?.consultantToken;
                if (sessionId) {
                    await this.consultantService.logout(sessionId);
                }
                res.clearCookie('consultantToken', (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, { message: 'Logged out successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobPipeline = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { jobId } = req.params;
                // Reusing getJobDetails as it contains pipeline data, filtering just pipeline info would be extra optimization
                // but valid deeply implemented logic is to fetch details.
                // Or we can just fetch pipeline specific:
                const details = await this.consultantService.getJobDetails(consultantId, jobId);
                return this.sendSuccess(res, details.pipeline || {});
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateJobPipeline = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { jobId } = req.params;
                const { stage, note } = req.body;
                const result = await this.consultantService.updateJobPipeline(consultantId, jobId, { stage, note });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.executeWithdrawal = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const { id } = req.params;
                const result = await this.withdrawalService.executeWithdrawal(id, consultantId);
                return this.sendSuccess(res, { withdrawal: result, message: 'Withdrawal execution initiated' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStripeStatus = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.withdrawalService.getStripeStatus(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.initiateStripeOnboarding = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.withdrawalService.initiateStripeOnboarding(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStripeLoginLink = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.withdrawalService.getStripeLoginLink(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.consultantService = new consultant_service_1.ConsultantService();
        this.candidateService = new consultant_candidate_service_1.ConsultantCandidateService();
        this.withdrawalService = new consultant_withdrawal_service_1.ConsultantWithdrawalService();
        this.conversationService = new conversation_service_1.ConversationService();
    }
}
exports.ConsultantController = ConsultantController;
