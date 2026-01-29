import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

// Note: This router assumes standard 'authenticate' middleware.
// If you need to support Candidates/Consultants, you might need a unified auth middleware
// or mount this router multiple times with different middlewares.

const router = Router();
const notificationController = new NotificationController();

router.get('/', unifiedAuthenticate, notificationController.list);
router.patch('/:id/read', unifiedAuthenticate, notificationController.markRead);
router.patch('/read-all', unifiedAuthenticate, notificationController.markAllRead);

export default router;
