import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

// User Management
router.get('/', authenticate, userController.getUsers);
router.post('/', authenticate, userController.createUser);
router.get('/:id', authenticate, userController.getUser);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, userController.deleteUser);

// Preferences
router.get('/preferences/notifications', authenticate, userController.getNotificationPreferences);
router.put('/preferences/notifications', authenticate, userController.updateNotificationPreferences);

// Alert Rules
router.get('/alerts/rules', authenticate, userController.getAlertRules);
router.post('/alerts/rules', authenticate, userController.createAlertRule);
router.put('/alerts/rules/:id', authenticate, userController.updateAlertRule);
router.delete('/alerts/rules/:id', authenticate, userController.deleteAlertRule);

export default router;
