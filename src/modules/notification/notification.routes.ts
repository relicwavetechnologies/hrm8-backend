import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

// Note: This router assumes standard 'authenticate' middleware.
// If you need to support Candidates/Consultants, you might need a unified auth middleware
// or mount this router multiple times with different middlewares.

const router = Router();
const notificationController = new NotificationController();

console.log('✅ [Routes] Notification routes being registered');

router.get('/', authenticateUnified, notificationController.list);
router.patch('/:id/read', authenticateUnified, notificationController.markRead);
router.patch('/read-all', authenticateUnified, notificationController.markAllRead);
router.delete('/:id', authenticateUnified, (req, res) => {
  console.log('🗑️  [Route] DELETE /:id hit for notification:', req.params.id);
  notificationController.delete(req, res);
});

export default router;
