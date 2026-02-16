import { Router } from 'express';
import { MessagingController } from './messaging.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const messagingController = new MessagingController();

// Fix syntax errors in wrapper functions
router.post('/conversations', authenticate, (req, res) => (messagingController.createConversation as any)(req, res));
router.get('/conversations', authenticate, (req, res) => (messagingController.getUserConversations as any)(req, res));
router.get('/conversations/:conversationId/messages', authenticate, (req, res) => (messagingController.getConversationMessages as any)(req, res));
router.post('/messages', authenticate, (req, res) => (messagingController.sendMessage as any)(req, res));
router.post('/conversations/:conversationId/read', authenticate, (req, res) => (messagingController.markAsRead as any)(req, res));

export default router;
