import { Router } from 'express';
import { TalentPoolController } from './talent-pool.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new TalentPoolController();

// Protected Routes
router.get('/search', authenticate, controller.search);
router.post('/invite', authenticate, controller.invite);
router.post('/bulk-invite', authenticate, controller.bulkInvite);

// Candidate Details
router.get('/candidates/:id', authenticate, controller.getCandidate);
router.get('/candidates/:id/resume', authenticate, controller.getResume);

// Public Routes (for viewing invitation details via link)
router.get('/invitation/:token', controller.getInvitation);

export default router;
