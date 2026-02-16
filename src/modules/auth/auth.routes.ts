import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login as any);
router.post('/logout', authController.logout as any);
router.get('/me', authenticate, authController.getCurrentUser as any);
router.post('/lead-conversion/accept', authController.acceptLeadConversionInvite as any);

export default router;
