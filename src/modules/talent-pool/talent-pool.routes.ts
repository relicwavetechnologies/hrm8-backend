import { Router } from 'express';
import { TalentPoolController } from './talent-pool.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new TalentPoolController();

// Search candidates in the talent pool
router.get('/search', authenticate, controller.search);

// Send a job invitation email
router.post('/invite', authenticate, controller.invite);

export default router;
