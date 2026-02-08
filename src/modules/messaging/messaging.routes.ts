import { Router } from 'express';
import { MessagingController } from './messaging.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const messagingController = new MessagingController();

router.post('/conversations', authenticate, (req, res) => messagingController.createConversation(req, res));
router.get('/conversations', authenticate, (req, res) => messagingController.getUserConversations(req, res));
router.get('/conversations/:conversationId/messages', authenticate, (req, res) => messagingController.getConversationMessages(req, res));
router.post('/messages', authenticate, (req, res) => messagingController.sendMessage(req, res));
router.post('/conversations/:conversationId/read', authenticate, (req, res) => messagingController.markAsRead(req, res));

export default router;
