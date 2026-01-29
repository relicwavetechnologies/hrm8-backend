import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { MessagingService } from './messaging.service';
import { MessagingRepository } from './messaging.repository';
import { UnifiedAuthenticatedRequest } from '../../types';
import { ParticipantType, ConversationChannelType } from '@prisma/client';

export class MessagingController extends BaseController {
    private messagingService: MessagingService;

    constructor() {
        super();
        this.messagingService = new MessagingService(new MessagingRepository());
    }

    getConversations = async (req: UnifiedAuthenticatedRequest, res: Response) => {
        try {
            const participantId = req.candidate?.id || req.user?.id;
            const participantType = req.candidate ? ParticipantType.CANDIDATE : ParticipantType.EMPLOYER;

            if (!participantId) {
                return this.sendError(res, new Error('Not authenticated'), 401);
            }

            const conversations = await this.messagingService.getConversations(participantId, participantType);
            return this.sendSuccess(res, { conversations });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getConversation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params as { id: string };
            const conversation = await this.messagingService.getConversation(id);

            if (!conversation) {
                return this.sendError(res, new Error('Conversation not found'), 404);
            }

            // Basic authorization: check if user is a participant
            const isParticipant = conversation.participants.some(
                p => (p as any).participantId === (req.candidate?.id || req.user?.id)
            );

            if (!isParticipant) {
                return this.sendError(res, new Error('Forbidden'), 403);
            }

            return this.sendSuccess(res, {
                conversation,
                messages: conversation.messages
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    sendMessage = async (req: UnifiedAuthenticatedRequest, res: Response) => {
        try {
            const { id: conversationId } = req.params as { id: string };
            const { content, attachments } = req.body;

            const senderId = req.candidate?.id || req.user?.id;
            const senderType = req.candidate ? ParticipantType.CANDIDATE : ParticipantType.EMPLOYER;
            const senderEmail = req.candidate?.email || req.user?.email;

            if (!senderId || !senderEmail) {
                return this.sendError(res, new Error('Not authenticated'), 401);
            }

            const message = await this.messagingService.sendMessage({
                conversationId,
                senderId,
                senderType,
                senderEmail,
                content,
                attachments,
            });

            return this.sendSuccess(res, {
                id: message.id,
                conversationId: message.conversation_id,
                senderType: message.sender_type,
                senderId: message.sender_id,
                senderEmail: message.sender_email,
                content: message.content,
                createdAt: message.created_at,
                attachments: message.attachments,
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    createConversation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
        try {
            const { subject, jobId, otherParticipantId, otherParticipantType, otherParticipantEmail, otherParticipantName, channelType } = req.body;

            const userId = req.candidate?.id || req.user?.id;
            const userType = req.candidate ? ParticipantType.CANDIDATE : ParticipantType.EMPLOYER;
            const userEmail = req.candidate?.email || req.user?.email;
            const userName = req.candidate ? `${req.candidate.firstName} ${req.candidate.lastName}` : req.user?.name;

            if (!userId || !userEmail) {
                return this.sendError(res, new Error('Not authenticated'), 401);
            }

            const participants = [
                {
                    participant_type: userType,
                    participant_id: userId,
                    participant_email: userEmail,
                    display_name: userName,
                },
                {
                    participant_type: otherParticipantType,
                    participant_id: otherParticipantId,
                    participant_email: otherParticipantEmail,
                    display_name: otherParticipantName,
                }
            ];

            const conversation = await this.messagingService.createConversation({
                subject,
                jobId,
                channelType: channelType || (req.candidate ? ConversationChannelType.CANDIDATE_EMPLOYER : ConversationChannelType.SYSTEM),
                participants,
                candidateId: req.candidate?.id || (otherParticipantType === ParticipantType.CANDIDATE ? otherParticipantId : undefined),
                employerUserId: req.user?.id || (otherParticipantType === ParticipantType.EMPLOYER ? otherParticipantId : undefined),
            });

            return this.sendSuccess(res, { conversation });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    markAsRead = async (req: UnifiedAuthenticatedRequest, res: Response) => {
        try {
            const { id: conversationId } = req.params as { id: string };
            const userId = req.candidate?.id || req.user?.id;

            if (!userId) {
                return this.sendError(res, new Error('Not authenticated'), 401);
            }

            await this.messagingService.markAsRead(conversationId, userId);
            return this.sendSuccess(res, { message: 'Messages marked as read' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
