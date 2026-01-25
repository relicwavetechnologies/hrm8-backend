import { Router } from 'express';
import { InterviewController } from './interview.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const interviewController = new InterviewController();

router.post('/', authenticate, interviewController.create);
router.get('/job/:jobId', authenticate, interviewController.listByJob);
router.get('/:id', authenticate, interviewController.getById);
router.patch('/:id/status', authenticate, interviewController.updateStatus);
router.post('/:id/feedback', authenticate, interviewController.addFeedback);

export default router;
