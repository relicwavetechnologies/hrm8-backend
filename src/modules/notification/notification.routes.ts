import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middlewares/auth.middleware';

// Note: This router assumes standard 'authenticate' middleware.
// If you need to support Candidates/Consultants, you might need a unified auth middleware
// or mount this router multiple times with different middlewares.

const router = Router();
const notificationController = new NotificationController();

// List and count
router.get('/', authenticate, notificationController.list);
router.get('/count', authenticate, notificationController.getUnreadCount);

// Single notification operations
router.get('/:id', authenticate, notificationController.getNotification);
router.patch('/:id/read', authenticate, notificationController.markRead);
router.delete('/:id', authenticate, notificationController.deleteNotification);

// Bulk operations
router.patch('/read-all', authenticate, notificationController.markAllRead);

// Admin/test operations
router.post('/test', authenticate, notificationController.createTestNotification);
router.post('/pulse', authenticate, notificationController.pushPulse);

export default router;
