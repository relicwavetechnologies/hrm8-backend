import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

// User Management
router.get('/', authenticate, userController.getUsers as any);
router.post('/', authenticate, userController.createUser as any);
router.get('/:id', authenticate, userController.getUser as any);
router.put('/:id', authenticate, userController.updateUser as any);
router.delete('/:id', authenticate, userController.deleteUser as any);

// Preferences
router.get('/preferences/notifications', authenticate, userController.getNotificationPreferences as any);
router.put('/preferences/notifications', authenticate, userController.updateNotificationPreferences as any);

// Alert Rules
router.get('/alerts/rules', authenticate, userController.getAlertRules as any);
router.post('/alerts/rules', authenticate, userController.createAlertRule as any);
router.put('/alerts/rules/:id', authenticate, userController.updateAlertRule as any);
router.delete('/alerts/rules/:id', authenticate, userController.deleteAlertRule as any);

export default router;
