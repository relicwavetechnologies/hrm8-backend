import { BaseRepository } from '../../core/repository';
import { Conversation, Message, ParticipantType, MessageContentType, ConversationStatus } from '@prisma/client';

export class ConversationRepository extends BaseRepository {
    async findById(id: string) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: true,
                job: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    }

    async findByJobAndCandidate(jobId: string, candidateId: string) {
        return this.prisma.conversation.findFirst({
            where: {
                job_id: jobId,
                candidate_id: candidateId,
            },
            include: { participants: true },
        });
    }

    async listForParticipant(participantId: string, includeArchived = false) {
        return this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: { participant_id: participantId },
                },
                ...(includeArchived ? {} : { status: ConversationStatus.ACTIVE }),
            },
            include: {
                participants: true,
                messages: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: [
                { last_message_at: 'desc' },
                { created_at: 'desc' },
            ],
        });
    }

    async create(data: any) {
        return this.prisma.conversation.create({
            data,
            include: { participants: true },
        });
    }

    async createMessage(data: any) {
        return this.prisma.message.create({
            data,
            include: { attachments: true },
        });
    }

    async updateLastMessage(conversationId: string, messageId: string, createdAt: Date) {
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                last_message_id: messageId,
                last_message_at: createdAt,
            },
        });
    }

    async findMessages(conversationId: string, limit = 50, cursor?: string) {
        return this.prisma.message.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'desc' },
            take: limit,
            ...(cursor
                ? {
                    skip: 1,
                    cursor: { id: cursor },
                }
                : {}),
            include: { attachments: true },
        });
    }

    async markAsRead(messageIds: string[], participantId: string) {
        // Note: read_by is a string array in Prisma
        // This is a simplified version, in production you'd use a more robust array update
        for (const id of messageIds) {
            await this.prisma.$executeRaw`
        UPDATE "Message" 
        SET "read_by" = array_append("read_by", ${participantId}),
            "read_at" = NOW()
        WHERE "id" = ${id} AND NOT (${participantId} = ANY("read_by"))
      `;
        }
    }

    async countUnread(participantId: string) {
        return this.prisma.message.count({
            where: {
                conversation: {
                    participants: { some: { participant_id: participantId } },
                },
                NOT: { read_by: { has: participantId } },
            },
        });
    }
}
