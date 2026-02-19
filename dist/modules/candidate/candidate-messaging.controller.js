"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateMessagingController = void 0;
const controller_1 = require("../../core/controller");
const conversation_service_1 = require("../communication/conversation.service");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma"); // Added for direct participant lookup if needed, though best to abstract
class CandidateMessagingController extends controller_1.BaseController {
    constructor() {
        super();
        this.getConversations = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const conversations = await this.conversationService.listConversationsForParticipant(req.candidate.id);
                return this.sendSuccess(res, { conversations });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getConversation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
                const conversation = await this.conversationService.getConversation(conversationId);
                if (!conversation) {
                    return this.sendError(res, new Error('Conversation not found'), 404);
                }
                // Verify candidate is a participant
                const isParticipant = conversation.participants.some(p => p.participant_id === req.candidate.id);
                if (!isParticipant) {
                    return this.sendError(res, new Error('Unauthorized'), 403);
                }
                const messages = await this.conversationService.listMessages(conversationId);
                return this.sendSuccess(res, { conversation, messages });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createConversation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { subject, jobId, employerUserId, consultantId } = req.body;
                const participants = [
                    {
                        participantType: client_1.ParticipantType.CANDIDATE,
                        participantId: req.candidate.id,
                        participantEmail: req.candidate.email,
                        displayName: `${req.candidate.firstName} ${req.candidate.lastName}`.trim(),
                    },
                ];
                if (employerUserId) {
                    const employer = await prisma_1.prisma.user.findUnique({ where: { id: employerUserId } });
                    if (employer) {
                        participants.push({
                            participantType: client_1.ParticipantType.EMPLOYER,
                            participantId: employer.id,
                            participantEmail: employer.email,
                            displayName: employer.name,
                        });
                    }
                }
                if (consultantId) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({ where: { id: consultantId } });
                    if (consultant) {
                        participants.push({
                            participantType: client_1.ParticipantType.CONSULTANT,
                            participantId: consultant.id,
                            participantEmail: consultant.email,
                            displayName: `${consultant.first_name} ${consultant.last_name}`.trim(),
                        });
                    }
                }
                const conversation = await this.conversationService.createConversation({
                    subject,
                    jobId,
                    candidateId: req.candidate.id,
                    employerUserId,
                    consultantId,
                    channelType: consultantId ? client_1.ConversationChannelType.CANDIDATE_CONSULTANT : client_1.ConversationChannelType.CANDIDATE_EMPLOYER,
                    participants,
                });
                return res.status(201).json({ success: true, data: { conversation } });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.sendMessage = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { conversationId, content, contentType, attachments } = req.body;
                if (!conversationId || (!content && !attachments)) {
                    return this.sendError(res, new Error('conversationId and content/attachments are required'), 400);
                }
                // Verify conversation and participation
                const conversation = await this.conversationService.getConversation(conversationId);
                if (!conversation) {
                    return this.sendError(res, new Error('Conversation not found'), 404);
                }
                const isParticipant = conversation.participants.some(p => p.participant_id === req.candidate.id);
                if (!isParticipant) {
                    return this.sendError(res, new Error('Unauthorized'), 403);
                }
                // Check conversation status
                if (conversation.status !== client_1.ConversationStatus.ACTIVE) {
                    return this.sendError(res, new Error(`Cannot send messages in ${conversation.status.toLowerCase()} conversations`), 403);
                }
                // === REPLY RESTRICTION LOGIC ===
                const messages = await this.conversationService.listMessages(conversationId, 100);
                if (messages.length === 0) {
                    return res.status(403).json({
                        success: false,
                        error: 'You cannot start a conversation. Please wait for the hiring team to contact you first.',
                        code: 'AWAITING_HR_FIRST_MESSAGE'
                    });
                }
                // Find last message from HR/Employer/Consultant (non-candidate)
                let lastHrMessageIndex = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].sender_type !== client_1.ParticipantType.CANDIDATE && messages[i].sender_type !== 'SYSTEM') { // Type cast SYSTEM as it might not be in ParticipantType enum yet if Prisma outdated
                        lastHrMessageIndex = i;
                        break;
                    }
                }
                // If no HR message found (and not empty due to check above), it means only candidate has sent messages?
                // Or maybe only System messages? If only System messages, we usually allow candidate to reply?
                // Legacy logic says "No HR messages at all - candidate cannot send".
                // However, if there are system messages (e.g. "Application Submitted") but NO HR message, should we block?
                // Legacy logic: "lastHrMessageIndex === -1" => BLOCK.
                // Implies candidate cannot talk until actual human responds.
                if (lastHrMessageIndex === -1) {
                    return res.status(403).json({
                        success: false,
                        error: 'You cannot send a message yet. Please wait for the hiring team to contact you first.',
                        code: 'AWAITING_HR_FIRST_MESSAGE'
                    });
                }
                // Count candidate messages AFTER the last HR message
                let candidateRepliesAfterHr = 0;
                for (let i = lastHrMessageIndex + 1; i < messages.length; i++) {
                    if (messages[i].sender_type === client_1.ParticipantType.CANDIDATE && messages[i].sender_id === req.candidate.id) {
                        candidateRepliesAfterHr++;
                    }
                }
                if (candidateRepliesAfterHr >= 1) {
                    return res.status(403).json({
                        success: false,
                        error: 'You have already replied to this message. Please wait for the hiring team to respond before sending another message.',
                        code: 'REPLY_LIMIT_REACHED'
                    });
                }
                // === END REPLY RESTRICTION LOGIC ===
                const message = await this.conversationService.createMessage({
                    conversationId,
                    senderType: client_1.ParticipantType.CANDIDATE,
                    senderId: req.candidate.id,
                    senderEmail: req.candidate.email,
                    content: content || '',
                    contentType,
                    attachments
                });
                return res.status(201).json({ success: true, data: { message } });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markAsRead = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
                // Verify conversation exists and candidate is a participant
                const conversation = await this.conversationService.getConversation(conversationId);
                if (!conversation) {
                    return this.sendError(res, new Error('Conversation not found'), 404);
                }
                const isParticipant = conversation.participants.some(p => p.participant_id === req.candidate.id);
                if (!isParticipant) {
                    return this.sendError(res, new Error('Unauthorized'), 403);
                }
                const count = await this.conversationService.markMessagesAsRead(conversationId, req.candidate.id);
                return this.sendSuccess(res, { markedAsReadCount: count });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.archiveConversation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
                const { reason = 'Candidate requested archiving' } = req.body;
                // Verify conversation exists and candidate is a participant
                const conversation = await this.conversationService.getConversation(conversationId);
                if (!conversation) {
                    return this.sendError(res, new Error('Conversation not found'), 404);
                }
                const isParticipant = conversation.participants.some((p) => p.participant_id === req.candidate.id);
                if (!isParticipant) {
                    return this.sendError(res, new Error('Unauthorized'), 403);
                }
                const updated = await this.conversationService.archiveConversation(conversationId, reason);
                return this.sendSuccess(res, { conversation: updated });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.closeConversation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
                const { reason = 'Candidate requested closing' } = req.body;
                // Verify conversation exists and candidate is a participant
                const conversation = await this.conversationService.getConversation(conversationId);
                if (!conversation) {
                    return this.sendError(res, new Error('Conversation not found'), 404);
                }
                const isParticipant = conversation.participants.some((p) => p.participant_id === req.candidate.id);
                if (!isParticipant) {
                    return this.sendError(res, new Error('Unauthorized'), 403);
                }
                const updated = await this.conversationService.closeConversation(conversationId, reason);
                return this.sendSuccess(res, { conversation: updated });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.conversationService = new conversation_service_1.ConversationService();
    }
}
exports.CandidateMessagingController = CandidateMessagingController;
