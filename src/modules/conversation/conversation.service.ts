import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { ConversationRepository } from './conversation.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { ParticipantType, MessageContentType, ConversationStatus, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';

export class ConversationService extends BaseService {
  private notificationService: NotificationService;

  constructor(
    private conversationRepository: ConversationRepository,
    notificationService?: NotificationService
  ) {
    super();
    this.notificationService = notificationService || new NotificationService(new NotificationRepository());
  }

  // GET /api/conversations - List conversations
  async getConversations(userId: string, filters?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    includeArchived?: boolean;
  }) {
    return this.conversationRepository.listForParticipant(userId, filters?.includeArchived);
  }

  // GET /api/conversations/:id - Get conversation details
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) throw new HttpException(404, 'Conversation not found');

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => p.participant_id === userId);
    if (!isParticipant) throw new HttpException(403, 'Unauthorized access to conversation');

    return conversation;
  }

  // GET /api/conversations/:id/messages - Get messages
  async getMessages(conversationId: string, userId: string, filters?: {
    limit?: number;
    cursor?: string;
  }) {
    // Verify access
    await this.getConversation(conversationId, userId);
    return this.conversationRepository.findMessages(conversationId, filters?.limit, filters?.cursor);
  }

  // POST /api/conversations - Create or get conversation
  async createOrGetConversation(userId: string, data: {
    jobId?: string;
    candidateId?: string;
    employerUserId?: string;
    consultantId?: string;
    participants: Array<{
      participantType: ParticipantType;
      participantId: string;
      participantEmail: string;
      displayName?: string;
    }>;
  }) {
    // If job and candidate provided, check for existing
    if (data.jobId && data.candidateId) {
      const existing = await this.conversationRepository.findByJobAndCandidate(data.jobId, data.candidateId);
      if (existing) return existing;
    }

    return this.conversationRepository.create({
      job_id: data.jobId,
      candidate_id: data.candidateId,
      employer_user_id: data.employerUserId,
      consultant_id: data.consultantId,
      participants: {
        create: data.participants.map(p => ({
          participant_type: p.participantType,
          participant_id: p.participantId,
          participant_email: p.participantEmail,
          display_name: p.displayName
        }))
      }
    });
  }

  // POST /api/conversations/:id/messages - Send message
  async sendMessage(conversationId: string, userId: string, data: {
    content: string;
    senderType: ParticipantType;
    senderEmail: string;
    senderName?: string;
    contentType?: MessageContentType;
    attachments?: any[];
  }) {
    const conversation = await this.getConversation(conversationId, userId);

    if (conversation.status !== ConversationStatus.ACTIVE && data.senderType !== ParticipantType.SYSTEM) {
      throw new HttpException(400, `Cannot send messages in ${conversation.status.toLowerCase()} conversations`);
    }

    const message = await this.conversationRepository.createMessage({
      conversation_id: conversationId,
      sender_type: data.senderType,
      sender_id: userId,
      sender_email: data.senderEmail,
      content: data.content,
      content_type: data.contentType || MessageContentType.TEXT,
      attachments: data.attachments ? {
        create: data.attachments.map(a => ({
          file_name: a.fileName,
          file_url: a.fileUrl,
          mime_type: a.mimeType,
          size: a.size
        }))
      } : undefined
    });

    await this.conversationRepository.updateLastMessage(conversationId, message.id, message.created_at);

    // Notify other participants
    if (data.senderType !== ParticipantType.SYSTEM) {
      try {
        await this.notifyMessageParticipants(message, conversation, userId, data.senderName);
      } catch (error) {
        console.error('[ConversationService] Failed to notify participants:', error);
      }
    }

    return message;
  }

  // Mark as read
  async markAsRead(conversationId: string, userId: string) {
    const messages = await this.conversationRepository.findMessages(conversationId, 100);
    const unreadIds = messages
      .filter(m => !m.read_by.includes(userId))
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await this.conversationRepository.markAsRead(unreadIds, userId);
    }

    return { success: true, count: unreadIds.length };
  }

  private async notifyMessageParticipants(message: any, conversation: any, senderId: string, senderName?: string) {
    const recipients = conversation.participants.filter((p: any) => p.participant_id !== senderId);

    for (const recipient of recipients) {
      let recipientType: NotificationRecipientType;

      switch (recipient.participant_type) {
        case ParticipantType.CANDIDATE:
          recipientType = NotificationRecipientType.CANDIDATE;
          break;
        case ParticipantType.CONSULTANT:
          recipientType = NotificationRecipientType.CONSULTANT;
          break;
        case ParticipantType.EMPLOYER:
          recipientType = NotificationRecipientType.USER;
          break;
        default:
          continue;
      }

      const name = senderName || conversation.participants.find((p: any) => p.participant_id === senderId)?.display_name || 'Someone';

      await this.notificationService.createNotification({
        recipientType,
        recipientId: recipient.participant_id,
        type: UniversalNotificationType.NEW_MESSAGE,
        title: `New message from ${name}`,
        message: message.content_type === MessageContentType.FILE ? 'Sent an attachment' : message.content,
        actionUrl: recipientType === NotificationRecipientType.CANDIDATE
          ? `/candidate/messages/${conversation.id}`
          : `/messages/${conversation.id}`,
        data: { conversationId: conversation.id, messageId: message.id, senderName: name }
      });
    }
  }
}

export const conversationService = new ConversationService(new ConversationRepository());
