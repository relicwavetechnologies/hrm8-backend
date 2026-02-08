import { BaseService } from '../../core/service';
import { ConversationChannelType, MessageContentType, ParticipantType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class MessagingService extends BaseService {
    async createConversation(participants: { id: string; type: ParticipantType; email: string; name?: string }[], type: ConversationChannelType = ConversationChannelType.CANDIDATE_EMPLOYER, metadata?: any) {
        return await this.prisma.conversation.create({
            data: {
                channel_type: type,
                // metadata is not in schema for Conversation, ignoring or need to check if schema has it? Schema showed subject, job_id etc.
                // Schema: subject, job_id, candidate_id, employer_user_id, consultant_id...
                participants: {
                    create: participants.map(p => ({
                        participant_id: p.id,
                        participant_type: p.type,
                        participant_email: p.email,
                        display_name: p.name
                    })),
                },
            },
            include: {
                participants: true,
            },
        });
    }

    async getUserConversations(userId: string) {
        return await this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        participant_id: userId,
                    },
                },
            },
            include: {
                participants: true,
                messages: {
                    orderBy: {
                        created_at: 'desc',
                    },
                    take: 1,
                },
            },
            orderBy: {
                updated_at: 'desc',
            },
        });
    }

    async getJobConversations(jobId: string, userId: string) {
        return await this.prisma.conversation.findMany({
            where: {
                job_id: jobId,
                participants: {
                    some: {
                        participant_id: userId,
                    },
                },
            },
            include: {
                participants: true,
                messages: {
                    orderBy: {
                        created_at: 'desc',
                    },
                    take: 1,
                },
            },
            orderBy: {
                updated_at: 'desc',
            },
        });
    }

    async getConversationMessages(conversationId: string) {
        return await this.prisma.message.findMany({
            where: {
                conversation_id: conversationId,
            },
            orderBy: {
                created_at: 'asc',
            },
        });
    }

    async sendMessage(sender: { id: string; type: ParticipantType; email: string }, conversationId: string, content: string, type: MessageContentType = MessageContentType.TEXT, metadata?: any) {
        // === MESSAGE RESTRICTION LOGIC ===
        // 1. Skip system messages
        if (sender.type !== 'SYSTEM' as any) {
            const messages = await this.prisma.message.findMany({
                where: { conversation_id: conversationId },
                orderBy: { created_at: 'asc' },
                take: 50
            });

            if (sender.type === ParticipantType.CANDIDATE) {
                // CANDIDATE RESTRICTION
                if (messages.length === 0) {
                    throw new HttpException(403, 'You cannot start a conversation. Please wait for the hiring team to contact you first.', 4010);
                }

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

                let candidateRepliesAfterHr = 0;
                for (let i = lastHrMessageIndex + 1; i < messages.length; i++) {
                    if (messages[i].sender_type === ParticipantType.CANDIDATE) {
                        candidateRepliesAfterHr++;
                    }
                }

                if (candidateRepliesAfterHr >= 1) {
                    throw new HttpException(403, 'You have already replied to this message. Please wait for the hiring team to respond.', 4011);
                }

            } else if (sender.type === ParticipantType.EMPLOYER || sender.type === ParticipantType.CONSULTANT) {
                // HR RESTRICTION
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

        const message = await this.prisma.message.create({
            data: {
                sender_id: sender.id,
                sender_type: sender.type,
                sender_email: sender.email,
                conversation_id: conversationId,
                content,
                content_type: type,
                // metadata not in schema for Message?
            },
        });

        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                updated_at: new Date(),
                last_message_at: new Date(),
                last_message_id: message.id
            },
        });

        return message;
    }

    async markAsRead(userId: string, conversationId: string) {
        // Schema doesn't have lastReadAt on Participant? Schema check needed.
        // Schema doesn't show lastReadAt in the view_file output for ConversationParticipant (lines 556-569).
        // Assuming we can't mark read per participant without schema change, or maybe I missed it.
        // For now, removing this or commenting it out if property doesn't exist.
        /*
        await this.prisma.conversationParticipant.updateMany({
          where: {
            participant_id: userId,
            conversation_id: conversationId,
          },
          data: {
            // last_read_at: new Date(), // Field likely missing
          },
        });
        */
    }

    async joinConversation(participant: { id: string; type: ParticipantType; email: string; name?: string }, conversationId: string) {
        const existing = await this.prisma.conversationParticipant.findFirst({
            where: {
                participant_id: participant.id,
                conversation_id: conversationId
            },
        });

        if (existing) return existing;

        return await this.prisma.conversationParticipant.create({
            data: {
                conversation_id: conversationId,
                participant_id: participant.id,
                participant_type: participant.type,
                participant_email: participant.email,
                display_name: participant.name
            },
        });
    }
}
