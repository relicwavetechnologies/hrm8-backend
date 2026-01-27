import { Router } from 'express';
import { AssessController } from './assess.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const assessController = new AssessController();

// Public routes (no auth required)
router.post('/register', assessController.registerAssessUser);
router.get('/job-options', assessController.getJobOptions);
router.post('/recommendations', assessController.getRecommendations);

// Protected routes (auth required)
router.get('/me', authenticate, assessController.getAssessUser);
router.post('/logout', authenticate, assessController.logoutAssessUser);
router.post('/jobs', authenticate, assessController.createInternalJob);

export default router;
