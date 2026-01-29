import { PrismaClient, ParticipantType, ConversationStatus, ConversationChannelType, MessageContentType } from '@prisma/client';

export class MessagingRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async findConversationsByParticipant(participantId: string, participantType: ParticipantType) {
        return this.prisma.conversation.findMany({
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
            },
            orderBy: { updated_at: 'desc' },
        });
    }

    async findConversationById(id: string) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: true,
                messages: {
                    orderBy: { created_at: 'asc' },
                    include: { attachments: true },
                },
            },
        });
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
