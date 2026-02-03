import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateAuthenticatedRequest } from '../../types';
import { ConversationService } from '../communication/conversation.service';

export class CandidateMessagingController extends BaseController {
  private conversationService: ConversationService;

  constructor() {
    super();
    this.conversationService = new ConversationService();
  }

  getConversations = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const conversations = await this.conversationService.listConversationsForParticipant(req.candidate.id);
      return this.sendSuccess(res, { conversations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getConversation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
      const conversation = await this.conversationService.getConversation(conversationId);

      if (!conversation) {
        return this.sendError(res, new Error('Conversation not found'), 404);
      }

      // Verify candidate is a participant
      const isParticipant = conversation.participants.some(p => p.participant_id === req.candidate!.id);
      if (!isParticipant) {
        return this.sendError(res, new Error('Unauthorized'), 403);
      }

      const messages = await this.conversationService.listMessages(conversationId);
      return this.sendSuccess(res, { conversation, messages });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  sendMessage = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { conversationId, content } = req.body;

      if (!conversationId || !content) {
        return this.sendError(res, new Error('conversationId and content are required'), 400);
      }

      // Verify candidate is a participant
      const conversation = await this.conversationService.getConversation(conversationId);
      if (!conversation) {
        return this.sendError(res, new Error('Conversation not found'), 404);
      }

      const isParticipant = conversation.participants.some(p => p.participant_id === req.candidate!.id);
      if (!isParticipant) {
        return this.sendError(res, new Error('Unauthorized'), 403);
      }

      const message = await this.conversationService.createMessage({
        conversationId,
        senderType: 'CANDIDATE',
        senderId: req.candidate.id,
        senderEmail: req.candidate.email,
        content,
      });

      return this.sendSuccess(res, { message });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markAsRead = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;

      // Verify conversation exists and candidate is a participant
      const conversation = await this.conversationService.getConversation(conversationId);
      if (!conversation) {
        return this.sendError(res, new Error('Conversation not found'), 404);
      }

      const isParticipant = conversation.participants.some(p => p.participant_id === req.candidate!.id);
      if (!isParticipant) {
        return this.sendError(res, new Error('Unauthorized'), 403);
      }

      const count = await this.conversationService.markMessagesAsRead(conversationId, req.candidate.id);
      return this.sendSuccess(res, { markedAsReadCount: count });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
