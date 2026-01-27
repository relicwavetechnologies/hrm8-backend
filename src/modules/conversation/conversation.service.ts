import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';

export class ConversationService extends BaseService {
  // NOTE: Conversation and Message models need to be added to Prisma schema
  // For now, using stub implementations

  // GET /api/conversations - List conversations
  async getConversations(userId: string, filters?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    // Stub: Return empty list until Conversation model is added
    return {
      conversations: [],
      pagination: {
        total: 0,
        page,
        limit,
        pages: 0,
      },
    };
  }

  // GET /api/conversations/:id - Get conversation details
  async getConversation(conversationId: string, userId: string) {
    // Stub: Return mock conversation
    return {
      id: conversationId,
      participants: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // GET /api/conversations/:id/messages - Get messages
  async getMessages(conversationId: string, userId: string, filters?: {
    page?: number;
    limit?: number;
    before?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    // Stub: Return empty list until Message model is added
    return {
      messages: [],
      pagination: {
        total: 0,
        page,
        limit,
        pages: 0,
      },
    };
  }

  // POST /api/conversations - Create or get conversation
  async createOrGetConversation(userId: string, data: {
    participantIds: string[];
    title?: string;
    type?: string;
  }) {
    // Stub: Return mock conversation
    return {
      id: 'conv_' + Date.now(),
      title: data.title,
      type: data.type || 'DIRECT',
      participants: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // POST /api/conversations/:id/messages - Send message
  async sendMessage(conversationId: string, userId: string, data: {
    content: string;
    type?: string;
    attachments?: any[];
  }) {
    // Stub: Return mock message
    return {
      id: 'msg_' + Date.now(),
      conversation_id: conversationId,
      sender_id: userId,
      content: data.content,
      type: data.type || 'TEXT',
      created_at: new Date(),
    };
  }

  // PUT /api/conversations/:id/read - Mark as read
  async markAsRead(conversationId: string, userId: string) {
    // Stub: Return success
    return { message: 'Conversation marked as read' };
  }
}

export const conversationService = new ConversationService();
