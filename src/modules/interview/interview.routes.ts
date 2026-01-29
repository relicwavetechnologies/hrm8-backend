import { Router } from 'express';
import { InterviewController } from './interview.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const interviewController = new InterviewController();

router.post('/', unifiedAuthenticate, interviewController.create);
router.get('/job/:jobId', unifiedAuthenticate, interviewController.listByJob);
router.get('/:id', unifiedAuthenticate, interviewController.getById);
router.patch('/:id/status', unifiedAuthenticate, interviewController.updateStatus);
router.post('/:id/feedback', unifiedAuthenticate, interviewController.addFeedback);

export default router;
