import { PrismaClient, ParticipantType, ConversationStatus, ConversationChannelType, MessageContentType } from '@prisma/client';

export class MessagingRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async findConversationsByParticipant(participantId: string, participantType: ParticipantType) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        participant_id: participantId,
                        participant_type: participantType,
                    },
                },
            },
            include: {
                participants: true,
                messages: {
                    take: 1,
                    orderBy: { created_at: 'desc' },
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { updated_at: 'desc' },
        });

        // Map participants and other fields to CamelCase for frontend
        return conversations.map(conv => ({
            id: conv.id,
            subject: conv.subject,
            jobId: conv.job_id,
            candidateId: conv.candidate_id,
            status: conv.status,
            channelType: conv.channel_type,
            lastMessageId: conv.last_message_id,
            lastMessageAt: conv.last_message_at,
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
            job: conv.job,
            participants: conv.participants.map(p => ({
                id: p.id,
                conversationId: p.conversation_id,
                participantType: p.participant_type,
                participantId: p.participant_id,
                participantEmail: p.participant_email,
                displayName: p.display_name,
                createdAt: p.created_at,
            })),
            lastMessage: conv.messages[0] ? {
                id: conv.messages[0].id,
                conversationId: conv.messages[0].conversation_id,
                senderType: conv.messages[0].sender_type,
                senderId: conv.messages[0].sender_id,
                senderEmail: conv.messages[0].sender_email,
                content: conv.messages[0].content,
                contentType: conv.messages[0].content_type,
                readBy: conv.messages[0].read_by,
                deliveredAt: conv.messages[0].delivered_at,
                readAt: conv.messages[0].read_at,
                createdAt: conv.messages[0].created_at,
                updatedAt: conv.messages[0].updated_at,
            } : null
        }));
    }

    async findConversationById(id: string) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: true,
                messages: {
                    orderBy: { created_at: 'asc' },
                    include: { attachments: true },
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
        });

        if (!conversation) return null;

        return {
            id: conversation.id,
            subject: conversation.subject,
            jobId: conversation.job_id,
            candidateId: conversation.candidate_id,
            status: conversation.status,
            channelType: conversation.channel_type,
            lastMessageId: conversation.last_message_id,
            lastMessageAt: conversation.last_message_at,
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at,
            job: conversation.job,
            participants: conversation.participants.map(p => ({
                id: p.id,
                conversationId: p.conversation_id,
                participantType: p.participant_type,
                participantId: p.participant_id,
                participantEmail: p.participant_email,
                displayName: p.display_name,
                createdAt: p.created_at,
            })),
            messages: conversation.messages.map(m => ({
                id: m.id,
                conversationId: m.conversation_id,
                senderType: m.sender_type,
                senderId: m.sender_id,
                senderEmail: m.sender_email,
                content: m.content,
                contentType: m.content_type,
                readBy: m.read_by,
                deliveredAt: m.delivered_at,
                readAt: m.read_at,
                createdAt: m.created_at,
                updatedAt: m.updated_at,
                attachments: m.attachments,
            }))
        };
    }

    async createConversation(data: {
        subject?: string;
        job_id?: string;
        candidate_id?: string;
        employer_user_id?: string;
        consultant_id?: string;
        channel_type: ConversationChannelType;
        participants: Array<{
            participant_type: ParticipantType;
            participant_id: string;
            participant_email: string;
            display_name?: string;
        }>;
    }) {
        const { participants, ...convData } = data;
        return this.prisma.conversation.create({
            data: {
                ...convData,
                participants: {
                    create: participants,
                },
            },
            include: {
                participants: true,
            },
        });
    }

    async createMessage(data: {
        conversation_id: string;
        sender_type: ParticipantType;
        sender_id: string;
        sender_email: string;
        content: string;
        content_type?: MessageContentType;
        attachments?: Array<{
            file_name: string;
            file_url: string;
            mime_type: string;
            size: number;
        }>;
    }) {
        const { attachments, ...msgData } = data;

        return this.prisma.$transaction(async (tx) => {
            const message = await tx.message.create({
                data: {
                    ...msgData,
                    attachments: attachments ? { create: attachments } : undefined,
                },
                include: { attachments: true },
            });

            // Update conversation last message info
            await tx.conversation.update({
                where: { id: data.conversation_id },
                data: {
                    last_message_id: message.id,
                    last_message_at: message.created_at,
                    updated_at: new Date(),
                },
            });

            return message;
        });
    }

    async markMessagesAsRead(conversationId: string, userId: string) {
        // This is simplified; real logic would append userId to read_by array
        // Since read_by is String[], we use Prisma's updateMany if possible or a raw query
        // For now, let's just update read_at if it's the first time
        return this.prisma.message.updateMany({
            where: {
                conversation_id: conversationId,
                NOT: {
                    sender_id: userId,
                },
                read_at: null,
            },
            data: {
                read_at: new Date(),
            },
        });
    }
}
