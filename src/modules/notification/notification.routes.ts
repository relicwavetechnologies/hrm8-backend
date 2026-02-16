import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

// Note: This router assumes standard 'authenticate' middleware.
// If you need to support Candidates/Consultants, you might need a unified auth middleware
// or mount this router multiple times with different middlewares.

const router = Router();
const notificationController = new NotificationController();

router.get('/', authenticateUnified, notificationController.list as any);
router.get('/:id', authenticateUnified, notificationController.getOne as any);
router.patch('/:id/read', authenticateUnified, notificationController.markRead as any);
router.patch('/read-all', authenticateUnified, notificationController.markAllRead as any);

export default router;
