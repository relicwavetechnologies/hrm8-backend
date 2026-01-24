import { Router } from 'express';
import { Hrm8Controller } from './hrm8.controller';
import { authenticateHrm8 } from '../../middlewares/hrm8-auth.middleware';

const router = Router();
const hrm8Controller = new Hrm8Controller();

// Auth Routes
router.post('/auth/login', hrm8Controller.login);
router.post('/auth/logout', hrm8Controller.logout);
router.get('/auth/me', authenticateHrm8, hrm8Controller.getCurrentUser);
router.put('/auth/change-password', authenticateHrm8, hrm8Controller.changePassword);

export default router;
