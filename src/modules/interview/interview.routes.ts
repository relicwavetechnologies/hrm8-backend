import { Router } from 'express';
import { InterviewController } from './interview.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();
const interviewController = new InterviewController();

router.post('/', authenticate, interviewController.create);
router.post('/suggest-time', authenticate, interviewController.suggestTime);
// Generic list with query params
router.get('/', authenticateUnified, interviewController.list);
router.get('/job/:jobId', authenticateUnified, interviewController.listByJob);
router.get('/application/:applicationId', authenticateUnified, interviewController.listByApplication);
router.get('/:id', authenticateUnified, interviewController.getById);
router.put('/:id', authenticate, interviewController.update);
router.patch('/:id/status', authenticate, interviewController.updateStatus);
router.post('/:id/feedback', authenticate, interviewController.addFeedback);
router.get('/:id/progression-status', authenticateUnified, interviewController.getProgressionStatus);

export default router;
