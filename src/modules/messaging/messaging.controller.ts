import { Response } from 'express';
import { MessagingService } from './messaging.service';
import { UnifiedAuthenticatedRequest, AuthenticatedRequest } from '../../types';
import { ParticipantType, ConversationChannelType, MessageContentType } from '@prisma/client';

export class MessagingController {
    private messagingService = new MessagingService();

    async createConversation(req: UnifiedAuthenticatedRequest, res: Response) {
        try {
            const { participants, type, metadata } = req.body;
            // Expected body: participants: { id: string, type: ParticipantType, email: string }[]

            // Construct current user participant
            let currentUserParticipant: { id: string; type: ParticipantType; email: string; name?: string };
            if (req.candidate) {
                currentUserParticipant = {
                    id: req.candidate.id,
                    type: ParticipantType.CANDIDATE,
                    email: req.candidate.email,
                    name: `${req.candidate.firstName} ${req.candidate.lastName}`
                };
            } else if (req.user) {
                let userType: ParticipantType = ParticipantType.EMPLOYER;
                if (req.user.type === 'CONSULTANT' || req.user.type === 'SALES_AGENT') {
                    userType = ParticipantType.CONSULTANT;
                }

                currentUserParticipant = {
                    id: req.user.id,
                    type: userType,
                    email: req.user.email,
                    name: req.user.email
                };
            } else {
                res.status(401).json({ success: false, error: 'User not authenticated' });
                return;
            }

            const allParticipants = [currentUserParticipant, ...participants];

            const conversation = await this.messagingService.createConversation(
                allParticipants,
                type as ConversationChannelType,
                metadata
            );
            res.status(201).json({ success: true, data: conversation });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async getUserConversations(req: AuthenticatedRequest, res: Response) {
        try {
            const { jobId } = req.query;
            let conversations;
            if (jobId && typeof jobId === 'string') {
                conversations = await this.messagingService.getJobConversations(jobId, req.user!.id);
            } else {
                conversations = await this.messagingService.getUserConversations(req.user!.id);
            }
            res.json({ success: true, data: conversations });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async getConversationMessages(req: AuthenticatedRequest, res: Response) {
        try {
            const { conversationId } = req.params;
            const messages = await this.messagingService.getConversationMessages(conversationId);
            res.json({ success: true, data: messages });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async sendMessage(req: UnifiedAuthenticatedRequest, res: Response) {
        try {
            const { conversationId, content, type, metadata } = req.body;

            let sender: { id: string; type: ParticipantType; email: string };
            if (req.candidate) {
                sender = {
                    id: req.candidate.id,
                    type: ParticipantType.CANDIDATE,
                    email: req.candidate.email
                };
            } else if (req.user) {
                let userType: ParticipantType = ParticipantType.EMPLOYER;
                if (req.user.type === 'CONSULTANT' || req.user.type === 'SALES_AGENT') {
                    userType = ParticipantType.CONSULTANT;
                }

                sender = {
                    id: req.user.id,
                    type: userType,
                    email: req.user.email
                };
            } else {
                res.status(401).json({ success: false, error: 'User not authenticated' });
                return;
            }

            const message = await this.messagingService.sendMessage(
                sender,
                conversationId,
                content,
                type as MessageContentType,
                metadata
            );
            res.status(201).json({ success: true, data: message });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async markAsRead(req: AuthenticatedRequest, res: Response) {
        try {
            const { conversationId } = req.params;
            await this.messagingService.markAsRead(req.user!.id, conversationId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
}
