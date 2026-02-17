"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingController = void 0;
const messaging_service_1 = require("./messaging.service");
const client_1 = require("@prisma/client");
class MessagingController {
    constructor() {
        this.messagingService = new messaging_service_1.MessagingService();
    }
    async createConversation(req, res) {
        try {
            const { participants, type, metadata } = req.body;
            // Expected body: participants: { id: string, type: ParticipantType, email: string }[]
            // Construct current user participant
            let currentUserParticipant;
            if (req.candidate) {
                currentUserParticipant = {
                    id: req.candidate.id,
                    type: client_1.ParticipantType.CANDIDATE,
                    email: req.candidate.email,
                    name: `${req.candidate.firstName} ${req.candidate.lastName}`
                };
            }
            else if (req.user) {
                let userType = client_1.ParticipantType.EMPLOYER;
                if (req.user.type === 'CONSULTANT' || req.user.type === 'SALES_AGENT') {
                    userType = client_1.ParticipantType.CONSULTANT;
                }
                currentUserParticipant = {
                    id: req.user.id,
                    type: userType,
                    email: req.user.email,
                    name: req.user.email
                };
            }
            else {
                res.status(401).json({ success: false, error: 'User not authenticated' });
                return;
            }
            const allParticipants = [currentUserParticipant, ...participants];
            const conversation = await this.messagingService.createConversation(allParticipants, type, metadata);
            res.status(201).json({ success: true, data: conversation });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
    async getUserConversations(req, res) {
        try {
            const { jobId } = req.query;
            let conversations;
            if (jobId && typeof jobId === 'string') {
                conversations = await this.messagingService.getJobConversations(jobId, req.user.id);
            }
            else {
                conversations = await this.messagingService.getUserConversations(req.user.id);
            }
            res.json({ success: true, data: conversations });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
    async getConversationMessages(req, res) {
        try {
            const { conversationId } = req.params;
            const messages = await this.messagingService.getConversationMessages(conversationId);
            res.json({ success: true, data: messages });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
    async sendMessage(req, res) {
        try {
            const { conversationId, content, type, metadata } = req.body;
            let sender;
            if (req.candidate) {
                sender = {
                    id: req.candidate.id,
                    type: client_1.ParticipantType.CANDIDATE,
                    email: req.candidate.email
                };
            }
            else if (req.user) {
                let userType = client_1.ParticipantType.EMPLOYER;
                if (req.user.type === 'CONSULTANT' || req.user.type === 'SALES_AGENT') {
                    userType = client_1.ParticipantType.CONSULTANT;
                }
                sender = {
                    id: req.user.id,
                    type: userType,
                    email: req.user.email
                };
            }
            else {
                res.status(401).json({ success: false, error: 'User not authenticated' });
                return;
            }
            const message = await this.messagingService.sendMessage(sender, conversationId, content, type, metadata);
            res.status(201).json({ success: true, data: message });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
    async markAsRead(req, res) {
        try {
            const { conversationId } = req.params;
            await this.messagingService.markAsRead(req.user.id, conversationId);
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
}
exports.MessagingController = MessagingController;
