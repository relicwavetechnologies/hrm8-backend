import { Router } from 'express';
import { MessagingController } from './messaging.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const messagingController = new MessagingController();

router.get('/conversations', unifiedAuthenticate, messagingController.getConversations);
router.post('/conversations', unifiedAuthenticate, messagingController.createConversation);
router.get('/conversations/:id', unifiedAuthenticate, messagingController.getConversation);
router.post('/conversations/:id/messages', unifiedAuthenticate, messagingController.sendMessage);
router.patch('/conversations/:id/read', unifiedAuthenticate, messagingController.markAsRead);
router.put('/conversations/:id/read', unifiedAuthenticate, messagingController.markAsRead);

export default router;
