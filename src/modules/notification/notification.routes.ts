import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// Listing & Count
router.get('/', unifiedAuthenticate, notificationController.list);
router.get('/count', unifiedAuthenticate, notificationController.getUnreadCount);

// Single Notification Operations
router.get('/:id', unifiedAuthenticate, notificationController.getNotification);
router.patch('/:id/read', unifiedAuthenticate, notificationController.markRead);
router.delete('/:id', unifiedAuthenticate, notificationController.deleteNotification);

// Bulk Operations
router.patch('/read-all', unifiedAuthenticate, notificationController.markAllRead);

// Test Operations
router.post('/test', unifiedAuthenticate, notificationController.createTestNotification);

export default router;
