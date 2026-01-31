import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { ConversationStatus, ParticipantType, MessageContentType } from '@prisma/client';

export class ConversationService {

    async listConversationsForParticipant(participantId: string) {
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        participant_id: participantId
                    }
                },
                status: 'ACTIVE'
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
}
