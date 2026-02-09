import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { ConversationStatus, ParticipantType, MessageContentType, ConversationChannelType, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';

export class ConversationService {

    async listConversationsForParticipant(participantId: string) {
        const conversations = await prisma.conversation.findMany({
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
                candidate = await prisma.candidate.findUnique({
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

    async createConversation(params: {
        subject?: string;
        jobId?: string;
        candidateId?: string;
        employerUserId?: string;
        consultantId?: string;
        channelType: ConversationChannelType;
        participants: Array<{
            participantType: ParticipantType;
            participantId: string;
            participantEmail: string;
            displayName?: string;
        }>;
    }) {
        return prisma.conversation.create({
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

    async getConversation(conversationId: string) {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: true,
                job: true
            }
        });

        if (!conversation) return null;

        let candidate = null;
        if (conversation.candidate_id) {
            candidate = await prisma.candidate.findUnique({
                where: { id: conversation.candidate_id },
                select: { id: true, first_name: true, last_name: true, photo: true, email: true }
            });
        }

        return { ...conversation, candidate };
    }

    async listMessages(conversationId: string, limit: number = 50, cursor?: string) {
        return prisma.message.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' },
            take: limit,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });
    }

    async createMessage(data: {
        conversationId: string;
        senderType: ParticipantType;
        senderId: string;
        senderEmail: string;
        content: string;
        contentType?: string;
        attachments?: any;
    }) {
        // === MESSAGE RESTRICTION LOGIC ===
        // 1. Skip system messages
        if (data.senderType !== 'SYSTEM' as any) {
            const messages = await prisma.message.findMany({
                where: { conversation_id: data.conversationId },
                orderBy: { created_at: 'asc' }, // Get all history to correctly identify HR/Candidate turns
                take: 50 // Recent history should suffice
            });

            if (data.senderType === ParticipantType.CANDIDATE) {
                // CANDIDATE RESTRICTION: Must wait for HR first and can only reply once
                if (messages.length === 0) {
                    throw new HttpException(403, 'You cannot start a conversation. Please wait for the hiring team to contact you first.', 4010);
                }

                // Find last message from HR (Employer/Consultant)
                let lastHrMessageIndex = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].sender_type !== ParticipantType.CANDIDATE && messages[i].sender_type !== ('SYSTEM' as ParticipantType)) {
                        lastHrMessageIndex = i;
                        break;
                    }
                }

                if (lastHrMessageIndex === -1) {
                    throw new HttpException(403, 'You cannot send a message yet. Please wait for the hiring team to contact you first.', 4010);
                }

                // Count candidate messages AFTER the last HR message
                let candidateRepliesAfterHr = 0;
                for (let i = lastHrMessageIndex + 1; i < messages.length; i++) {
                    if (messages[i].sender_type === ParticipantType.CANDIDATE) {
                        candidateRepliesAfterHr++;
                    }
                }

                if (candidateRepliesAfterHr >= 1) {
                    throw new HttpException(403, 'You have already replied to this message. Please wait for the hiring team to respond.', 4011);
                }

            } else if (data.senderType === ParticipantType.EMPLOYER || data.senderType === ParticipantType.CONSULTANT) {
                // HR RESTRICTION: Only allow one follow-up message after the initial HR message
                let consecutiveHrMessages = 0;
                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].sender_type === ParticipantType.CANDIDATE) break;
                    if (messages[i].sender_type === ParticipantType.EMPLOYER || messages[i].sender_type === ParticipantType.CONSULTANT) {
                        consecutiveHrMessages++;
                    }
                }

                if (consecutiveHrMessages >= 2) {
                    throw new HttpException(403, 'You have already sent a follow-up message. Please wait for the candidate response.', 4011);
                }
            }
        }
        // === END MESSAGE RESTRICTION LOGIC ===

        const message = await prisma.message.create({
            data: {
                conversation_id: data.conversationId,
                sender_type: data.senderType,
                sender_id: data.senderId,
                sender_email: data.senderEmail,
                content: data.content,
                content_type: (data.contentType as MessageContentType) || 'TEXT',
                read_by: [data.senderEmail]
            }
        });

        await prisma.conversation.update({
            where: { id: data.conversationId },
            data: {
                last_message_id: message.id,
                last_message_at: message.created_at,
                updated_at: new Date()
            }
        });

        // Send notifications to all participants except the sender
        if (data.senderType !== 'SYSTEM' as any) {
            try {
                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    include: { participants: true, job: { select: { title: true } } }
                });

                if (conversation) {
                    const notificationService = new NotificationService(new NotificationRepository());
                    const senderName = data.senderEmail.split('@')[0]; // Simple fallback
                    const jobTitle = conversation.job?.title || 'your application';
                    const messagePreview = data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content;

                    for (const participant of conversation.participants) {
                        // Skip the sender
                        if (participant.participant_id === data.senderId) continue;

                        // Determine recipient type based on participant type
                        let recipientType: NotificationRecipientType;
                        if (participant.participant_type === ParticipantType.CANDIDATE) {
                            recipientType = NotificationRecipientType.CANDIDATE;
                        } else if (participant.participant_type === ParticipantType.EMPLOYER) {
                            recipientType = NotificationRecipientType.USER;
                        } else {
                            recipientType = NotificationRecipientType.CONSULTANT;
                        }

                        await notificationService.createNotification({
                            recipientType,
                            recipientId: participant.participant_id,
                            type: UniversalNotificationType.NEW_MESSAGE,
                            title: 'New Message',
                            message: `${senderName} sent you a message regarding ${jobTitle}: "${messagePreview}"`,
                            data: {
                                conversationId: data.conversationId,
                                messageId: message.id,
                                senderEmail: data.senderEmail,
                                jobId: conversation.job_id
                            },
                            actionUrl: recipientType === NotificationRecipientType.CANDIDATE
                                ? `/candidate/messages/${data.conversationId}`
                                : recipientType === NotificationRecipientType.CONSULTANT
                                ? `/consultant/messages?conversationId=${data.conversationId}`
                                : `/jobs/${conversation.job_id}?tab=messages&conversationId=${data.conversationId}`,
                            email: participant.participant_email || undefined
                        });
                    }
                }
            } catch (notifyError) {
                console.error('[ConversationService] Error sending message notifications:', notifyError);
                // Don't fail the message creation if notifications fail
            }
        }

        return message;
    }

    async markMessagesAsRead(conversationId: string, readerId: string) {
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversation_id: conversationId, participant_id: readerId }
        });

        if (!participant || !participant.participant_email) return 0;

        const email = participant.participant_email;

        const unreadMessages = await prisma.message.findMany({
            where: {
                conversation_id: conversationId,
                NOT: {
                    read_by: { has: email }
                }
            },
            select: { id: true }
        });

        if (unreadMessages.length === 0) return 0;

        await prisma.$transaction(
            unreadMessages.map(msg =>
                prisma.message.update({
                    where: { id: msg.id },
                    data: {
                        read_by: { push: email },
                        read_at: new Date()
                    }
                })
            )
        );

        // ConversationParticipant doesn't have last_read_at in schema snippet provided.
        // Skipping update for it to avoid error.

        return unreadMessages.length;
    }

    async findConversationByJobAndCandidate(jobId: string, candidateId: string) {
        const conversation = await prisma.conversation.findFirst({
            where: {
                job_id: jobId,
                candidate_id: candidateId
            },
            include: {
                participants: true
            }
        });

        if (!conversation) return null;

        let candidate = null;
        if (conversation.candidate_id) {
            candidate = await prisma.candidate.findUnique({
                where: { id: conversation.candidate_id },
                select: { id: true, first_name: true, last_name: true, photo: true, email: true }
            });
        }

        return { ...conversation, candidate };
    }

    async archiveConversation(conversationId: string, reason: string) {
        const conversation = await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'ARCHIVED' },
            include: { participants: true }
        });

        // Add system message about archiving
        await this.createMessage({
            conversationId,
            senderType: 'SYSTEM' as any,
            senderId: 'SYSTEM',
            senderEmail: 'system@hrm8.email',
            content: `Conversation archived: ${reason}`,
            contentType: 'TEXT'
        });

        return conversation;
    }

    async closeConversation(conversationId: string, reason: string) {
        const conversation = await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'CLOSED' },
            include: { participants: true }
        });

        // Add system message about closing
        await this.createMessage({
            conversationId,
            senderType: 'SYSTEM' as any,
            senderId: 'SYSTEM',
            senderEmail: 'system@hrm8.email',
            content: `Conversation closed: ${reason}`,
            contentType: 'TEXT'
        });

        return conversation;
    }
}
