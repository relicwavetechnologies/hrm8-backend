import { Router } from 'express';
import { ConversationController } from './conversation.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const conversationController = new ConversationController();

// All conversation routes require authentication
router.use(authenticate);

// Conversation routes
router.get('/', conversationController.getConversations);
router.get('/:id', conversationController.getConversation);
router.get('/:id/messages', conversationController.getMessages);
router.post('/', conversationController.createConversation);
router.post('/:id/messages', conversationController.sendMessage);
router.put('/:id/read', conversationController.markAsRead);

export default router;
