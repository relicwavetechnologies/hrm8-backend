import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ConversationService } from './conversation.service';
import { AuthenticatedRequest } from '../../types';

export class ConversationController extends BaseController {
  private conversationService: ConversationService;

  constructor() {
    super();
    this.conversationService = new ConversationService();
  }

  // GET /api/conversations - List conversations
  getConversations = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { page, limit, unreadOnly } = req.query;

      const result = await this.conversationService.getConversations(req.user.id, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        unreadOnly: unreadOnly === 'true',
      });

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/conversations/:id - Get conversation details
  getConversation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { id } = req.params as { id: string };
      const conversation = await this.conversationService.getConversation(id, req.user.id);

      return this.sendSuccess(res, { conversation });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/conversations/:id/messages - Get messages
  getMessages = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { id } = req.params as { id: string };
      const { page, limit, before } = req.query;

      const result = await this.conversationService.getMessages(id, req.user.id, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        before: before as string,
      });

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/conversations - Create or get conversation
  createConversation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const conversation = await this.conversationService.createOrGetConversation(
        req.user.id,
        req.body
      );

      return this.sendSuccess(res, { conversation }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/conversations/:id/messages - Send message
  sendMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { id } = req.params as { id: string };
      const message = await this.conversationService.sendMessage(id, req.user.id, req.body);

      return this.sendSuccess(res, { message }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // PUT /api/conversations/:id/read - Mark as read
  markAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'));
      }

      const { id } = req.params as { id: string };
      const result = await this.conversationService.markAsRead(id, req.user.id);

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
