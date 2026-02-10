import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateHrm8 } from '../../middlewares/hrm8-auth.middleware';
import { AssistantController } from './assistant.controller';

const router = Router();
const controller = new AssistantController();

// Company-side assistant (ATS/admin company users)
router.post('/chat', authenticate, controller.companyChat);

// HRM8 admin-side assistant
router.post('/chat/hrm8', authenticateHrm8, controller.hrm8Chat);

export default router;
