import { MessagingRepository } from './messaging.repository';
import { ParticipantType, ConversationChannelType } from '@prisma/client';

export class MessagingService {
    private messagingRepository: MessagingRepository;

    constructor(messagingRepository: MessagingRepository) {
        this.messagingRepository = messagingRepository;
    }

    async getConversations(participantId: string, participantType: ParticipantType) {
        return this.messagingRepository.findConversationsByParticipant(participantId, participantType);
    }

    async getConversation(id: string) {
        return this.messagingRepository.findConversationById(id);
    }

    async sendMessage(data: {
        conversationId: string;
        senderId: string;
        senderType: ParticipantType;
        senderEmail: string;
        content: string;
        attachments?: any[];
    }) {
        const message = await this.messagingRepository.createMessage({
            conversation_id: data.conversationId,
            sender_id: data.senderId,
            sender_type: data.senderType,
            sender_email: data.senderEmail,
            content: data.content,
            attachments: data.attachments,
        });

        // Real-time broadcast
        try {
            const { broadcast } = await import('../../websocket/server');
            broadcast({
                type: 'new_message',
                payload: {
                    id: message.id,
                    conversationId: message.conversation_id,
                    content: message.content,
                    senderId: message.sender_id,
                    senderType: message.sender_type,
                    senderEmail: message.sender_email,
                    contentType: message.content_type,
                    createdAt: message.created_at,
                    updatedAt: message.updated_at,
                    attachments: message.attachments,
                }
            }, {
                type: 'room',
                conversationId: message.conversation_id
            });
        } catch (err) {
            console.error('Failed to broadcast new message:', err);
        }

        return message;
    }

    async createConversation(data: {
        subject?: string;
        jobId?: string;
        candidateId?: string;
        employerUserId?: string;
        consultantId?: string;
        channelType: ConversationChannelType;
        participants: any[];
    }) {
        return this.messagingRepository.createConversation({
            subject: data.subject,
            job_id: data.jobId,
            candidate_id: data.candidateId,
            employer_user_id: data.employerUserId,
            consultant_id: data.consultantId,
            channel_type: data.channelType,
            participants: data.participants,
        });
    }

    async markAsRead(conversationId: string, userId: string) {
        return this.messagingRepository.markMessagesAsRead(conversationId, userId);
    }
}
