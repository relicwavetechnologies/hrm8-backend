"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationController = void 0;
const controller_1 = require("../../core/controller");
const communication_service_1 = require("./communication.service");
class CommunicationController extends controller_1.BaseController {
    constructor() {
        super();
        // Test email endpoint for admin
        this.sendTestEmail = async (req, res) => {
            try {
                if (!req.user || req.user.role !== 'ADMIN') {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const { to } = req.body;
                // Use direct email sending for test
                return this.sendSuccess(res, { message: 'Test email endpoint - configure SMTP settings' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // ==================== CALL LOGS ====================
        this.logCall = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const { callDate, outcome, phoneNumber, duration, notes } = req.body;
                if (!callDate || !outcome) {
                    return this.sendError(res, new Error('callDate and outcome are required'), 400);
                }
                const validOutcomes = ['PICKED_UP', 'BUSY', 'NO_ANSWER', 'LEFT_VOICEMAIL', 'WRONG_NUMBER', 'SCHEDULED_CALLBACK'];
                if (!validOutcomes.includes(outcome)) {
                    return this.sendError(res, new Error(`Invalid outcome. Must be one of: ${validOutcomes.join(', ')}`), 400);
                }
                const callLog = await this.communicationService.logCall({
                    applicationId,
                    userId: req.user.id,
                    callDate: new Date(callDate),
                    outcome: outcome,
                    phoneNumber,
                    duration,
                    notes,
                });
                return this.sendSuccess(res, { callLog });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCallLogs = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const callLogs = await this.communicationService.getCallLogs(applicationId);
                return this.sendSuccess(res, { callLogs });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // ==================== EMAIL ====================
        this.sendEmail = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const { subject, body, templateId } = req.body;
                if (!subject || !body) {
                    return this.sendError(res, new Error('subject and body are required'), 400);
                }
                const emailLog = await this.communicationService.sendCandidateEmail({
                    applicationId,
                    userId: req.user.id,
                    subject,
                    body,
                    templateId,
                });
                return this.sendSuccess(res, { emailLog });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getEmailLogs = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const emailLogs = await this.communicationService.getEmailLogs(applicationId);
                return this.sendSuccess(res, { emailLogs });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getEmailTemplates = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const templates = await this.communicationService.getEmailTemplates(req.user.companyId);
                return this.sendSuccess(res, { templates });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.generateEmailWithAI = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const { purpose, tone } = req.body;
                if (!purpose) {
                    return this.sendError(res, new Error('purpose is required'), 400);
                }
                const generatedEmail = await this.communicationService.generateEmailWithAI({
                    applicationId,
                    purpose,
                    tone,
                });
                return this.sendSuccess(res, { email: generatedEmail });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // ==================== SMS ====================
        this.sendSms = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const { message } = req.body;
                if (!message) {
                    return this.sendError(res, new Error('message is required'), 400);
                }
                if (message.length > 1600) {
                    return this.sendError(res, new Error('SMS message cannot exceed 1600 characters'), 400);
                }
                const smsLog = await this.communicationService.sendSms({
                    applicationId,
                    userId: req.user.id,
                    message,
                });
                return this.sendSuccess(res, { smsLog });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getSmsLogs = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const smsLogs = await this.communicationService.getSmsLogs(applicationId);
                return this.sendSuccess(res, { smsLogs });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // ==================== SLACK ====================
        this.sendSlackMessage = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const { recipientIds, message } = req.body;
                if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
                    return this.sendError(res, new Error('recipientIds array is required'), 400);
                }
                if (!message) {
                    return this.sendError(res, new Error('message is required'), 400);
                }
                const slackLog = await this.communicationService.sendSlackMessage({
                    applicationId,
                    userId: req.user.id,
                    recipientIds,
                    message,
                });
                return this.sendSuccess(res, { slackLog });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getSlackLogs = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const slackLogs = await this.communicationService.getSlackLogs(applicationId);
                return this.sendSuccess(res, { slackLogs });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getHiringTeamForSlack = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { jobId } = req.params;
                const team = await this.communicationService.getHiringTeamForSlack(jobId);
                return this.sendSuccess(res, { team });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.communicationService = new communication_service_1.CommunicationService();
    }
}
exports.CommunicationController = CommunicationController;
