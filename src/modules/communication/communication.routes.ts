import { Router } from 'express';
import { CommunicationController } from './communication.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const communicationController = new CommunicationController();

// Internal/Admin routes
router.post('/send-test', authenticate, communicationController.sendTestEmail as any);

export default router;
