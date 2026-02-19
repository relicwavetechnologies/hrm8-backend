"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../notification/notification.service");
const notification_repository_1 = require("../notification/notification.repository");
class ConversationService {
    async listConversationsForParticipant(participantId) {
        const conversations = await prisma_1.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        participant_id: participantId
                    }
                },
                // status: 'ACTIVE' // Removed to allow seeing all conversations
            },
            include: {
                participants: true,
                messages: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                },
                job: {
                    select: { title: true, company: { select: { name: true } } }
                }
            },
            orderBy: { updated_at: 'desc' }
        });
        // Manually fetch candidate details where needed since relation doesn't exist in Prisma schema
        const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
            let candidate = null;
            if (conv.candidate_id) {
                candidate = await prisma_1.prisma.candidate.findUnique({
                    where: { id: conv.candidate_id },
                    select: { first_name: true, last_name: true, photo: true }
                });
            }
            return {
                ...conv,
                candidate
            };
        }));
        return conversationsWithDetails;
    }
    async createConversation(params) {
        return prisma_1.prisma.conversation.create({
            data: {
                subject: params.subject,
                job_id: params.jobId,
                candidate_id: params.candidateId,
                employer_user_id: params.employerUserId,
                consultant_id: params.consultantId,
                channel_type: params.channelType,
                participants: {
                    create: params.participants.map((p) => ({
                        participant_type: p.participantType,
                        participant_id: p.participantId,
                        participant_email: p.participantEmail,
                        display_name: p.displayName,
                    })),
                },
            },
            include: { participants: true },
        });
    }
    async getConversation(conversationId) {
        const conversation = await prisma_1.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: true,
                job: true
            }
        });
        if (!conversation)
            return null;
        let candidate = null;
        if (conversation.candidate_id) {
            candidate = await prisma_1.prisma.candidate.findUnique({
                where: { id: conversation.candidate_id },
                select: { id: true, first_name: true, last_name: true, photo: true, email: true }
            });
        }
        return { ...conversation, candidate };
    }
    async listMessages(conversationId, limit = 50, cursor) {
        return prisma_1.prisma.message.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' },
            take: limit,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });
    }
    async createMessage(data) {
        // === MESSAGE RESTRICTION LOGIC ===
        // 1. Skip system messages
        if (data.senderType !== 'SYSTEM') {
            const messages = await prisma_1.prisma.message.findMany({
                where: { conversation_id: data.conversationId },
                orderBy: { created_at: 'asc' }, // Get all history to correctly identify HR/Candidate turns
                take: 50 // Recent history should suffice
            });
            if (data.senderType === client_1.ParticipantType.CANDIDATE) {
                // CANDIDATE RESTRICTION: Must wait for HR first and can only reply once
                if (messages.length === 0) {
                    throw new http_exception_1.HttpException(403, 'You cannot start a conversation. Please wait for the hiring team to contact you first.', 4010);
                }
                // Find last message from HR (Employer/Consultant)
                let lastHrMessageIndex = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].sender_type !== client_1.ParticipantType.CANDIDATE && messages[i].sender_type !== 'SYSTEM') {
                        lastHrMessageIndex = i;
                        break;
                    }
                }
                if (lastHrMessageIndex === -1) {
                    throw new http_exception_1.HttpException(403, 'You cannot send a message yet. Please wait for the hiring team to contact you first.', 4010);
                }
                // Count candidate messages AFTER the last HR message
                let candidateRepliesAfterHr = 0;
                for (let i = lastHrMessageIndex + 1; i < messages.length; i++) {
                    if (messages[i].sender_type === client_1.ParticipantType.CANDIDATE) {
                        candidateRepliesAfterHr++;
                    }
                }
                if (candidateRepliesAfterHr >= 1) {
                    throw new http_exception_1.HttpException(403, 'You have already replied to this message. Please wait for the hiring team to respond.', 4011);
                }
            }
            else if (data.senderType === client_1.ParticipantType.EMPLOYER || data.senderType === client_1.ParticipantType.CONSULTANT) {
                // HR RESTRICTION: Only allow one follow-up message after the initial HR message
                let consecutiveHrMessages = 0;
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].sender_type === client_1.ParticipantType.CANDIDATE)
                        break;
                    if (messages[i].sender_type === client_1.ParticipantType.EMPLOYER || messages[i].sender_type === client_1.ParticipantType.CONSULTANT) {
                        consecutiveHrMessages++;
                    }
                }
                if (consecutiveHrMessages >= 2) {
                    throw new http_exception_1.HttpException(403, 'You have already sent a follow-up message. Please wait for the candidate response.', 4011);
                }
            }
        }
        // === END MESSAGE RESTRICTION LOGIC ===
        const message = await prisma_1.prisma.message.create({
            data: {
                conversation_id: data.conversationId,
                sender_type: data.senderType,
                sender_id: data.senderId,
                sender_email: data.senderEmail,
                content: data.content,
                content_type: data.contentType || 'TEXT',
                read_by: [data.senderEmail]
            }
        });
        await prisma_1.prisma.conversation.update({
            where: { id: data.conversationId },
            data: {
                last_message_id: message.id,
                last_message_at: message.created_at,
                updated_at: new Date()
            }
        });
        // Send notifications to all participants except the sender
        if (data.senderType !== 'SYSTEM') {
            try {
                const conversation = await prisma_1.prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    include: { participants: true, job: { select: { title: true } } }
                });
                if (conversation) {
                    const notificationService = new notification_service_1.NotificationService(new notification_repository_1.NotificationRepository());
                    const senderName = data.senderEmail.split('@')[0]; // Simple fallback
                    const jobTitle = conversation.job?.title || 'your application';
                    const messagePreview = data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content;
                    for (const participant of conversation.participants) {
                        // Skip the sender
                        if (participant.participant_id === data.senderId)
                            continue;
                        // Determine recipient type based on participant type
                        let recipientType;
                        if (participant.participant_type === client_1.ParticipantType.CANDIDATE) {
                            recipientType = client_1.NotificationRecipientType.CANDIDATE;
                        }
                        else if (participant.participant_type === client_1.ParticipantType.EMPLOYER) {
                            recipientType = client_1.NotificationRecipientType.USER;
                        }
                        else {
                            recipientType = client_1.NotificationRecipientType.CONSULTANT;
                        }
                        await notificationService.createNotification({
                            recipientType,
                            recipientId: participant.participant_id,
                            type: client_1.UniversalNotificationType.NEW_MESSAGE,
                            title: 'New Message',
                            message: `${senderName} sent you a message regarding ${jobTitle}: "${messagePreview}"`,
                            data: {
                                conversationId: data.conversationId,
                                messageId: message.id,
                                senderEmail: data.senderEmail,
                                jobId: conversation.job_id
                            },
                            actionUrl: recipientType === client_1.NotificationRecipientType.CANDIDATE
                                ? `/candidate/messages/${data.conversationId}`
                                : recipientType === client_1.NotificationRecipientType.CONSULTANT
                                    ? `/consultant/messages?conversationId=${data.conversationId}`
                                    : `/jobs/${conversation.job_id}?tab=messages&conversationId=${data.conversationId}`,
                            email: participant.participant_email || undefined
                        });
                    }
                }
            }
            catch (notifyError) {
                console.error('[ConversationService] Error sending message notifications:', notifyError);
                // Don't fail the message creation if notifications fail
            }
        }
        return message;
    }
    async markMessagesAsRead(conversationId, readerId) {
        const participant = await prisma_1.prisma.conversationParticipant.findFirst({
            where: { conversation_id: conversationId, participant_id: readerId }
        });
        if (!participant || !participant.participant_email)
            return 0;
        const email = participant.participant_email;
        const unreadMessages = await prisma_1.prisma.message.findMany({
            where: {
                conversation_id: conversationId,
                NOT: {
                    read_by: { has: email }
                }
            },
            select: { id: true }
        });
        if (unreadMessages.length === 0)
            return 0;
        await prisma_1.prisma.$transaction(unreadMessages.map(msg => prisma_1.prisma.message.update({
            where: { id: msg.id },
            data: {
                read_by: { push: email },
                read_at: new Date()
            }
        })));
        // ConversationParticipant doesn't have last_read_at in schema snippet provided.
        // Skipping update for it to avoid error.
        return unreadMessages.length;
    }
    async findConversationByJobAndCandidate(jobId, candidateId) {
        const conversation = await prisma_1.prisma.conversation.findFirst({
            where: {
                job_id: jobId,
                candidate_id: candidateId
            },
            include: {
                participants: true
            }
        });
        if (!conversation)
            return null;
        let candidate = null;
        if (conversation.candidate_id) {
            candidate = await prisma_1.prisma.candidate.findUnique({
                where: { id: conversation.candidate_id },
                select: { id: true, first_name: true, last_name: true, photo: true, email: true }
            });
        }
        return { ...conversation, candidate };
    }
    async archiveConversation(conversationId, reason) {
        const conversation = await prisma_1.prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'ARCHIVED' },
            include: { participants: true }
        });
        // Add system message about archiving
        await this.createMessage({
            conversationId,
            senderType: 'SYSTEM',
            senderId: 'SYSTEM',
            senderEmail: 'system@hrm8.email',
            content: `Conversation archived: ${reason}`,
            contentType: 'TEXT'
        });
        return conversation;
    }
    async closeConversation(conversationId, reason) {
        const conversation = await prisma_1.prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'CLOSED' },
            include: { participants: true }
        });
        // Add system message about closing
        await this.createMessage({
            conversationId,
            senderType: 'SYSTEM',
            senderId: 'SYSTEM',
            senderEmail: 'system@hrm8.email',
            content: `Conversation closed: ${reason}`,
            contentType: 'TEXT'
        });
        return conversation;
    }
}
exports.ConversationService = ConversationService;
