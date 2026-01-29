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
        return this.messagingRepository.createMessage({
            conversation_id: data.conversationId,
            sender_id: data.senderId,
            sender_type: data.senderType,
            sender_email: data.senderEmail,
            content: data.content,
            attachments: data.attachments,
        });
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
