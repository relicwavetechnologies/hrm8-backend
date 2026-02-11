import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateHrm8 } from '../../middlewares/hrm8-auth.middleware';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';
import { AssistantController } from './assistant.controller';

const router = Router();
const controller = new AssistantController();

// Company-side assistant (ATS/admin company users)
router.post('/chat', authenticate, controller.companyChat);

// Consultant-side assistant
router.post('/chat/stream', authenticateConsultant, controller.consultantChatStream);

// HRM8 admin-side assistant
router.post('/chat/hrm8', authenticateHrm8, controller.hrm8Chat);
router.post('/chat/hrm8/stream', authenticateHrm8, controller.hrm8ChatStream);

export default router;
