import { Router } from 'express';
import { InterviewController } from './interview.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();
const interviewController = new InterviewController();

router.post('/', authenticate, interviewController.create as any);
// Generic list with query params
router.get('/', authenticateUnified, interviewController.list as any);
router.get('/job/:jobId', authenticateUnified, interviewController.listByJob as any);
router.get('/application/:applicationId', authenticateUnified, interviewController.listByApplication as any);
router.get('/:id', authenticateUnified, interviewController.getById as any);
router.put('/:id', authenticate, interviewController.update as any);
router.patch('/:id/status', authenticate, interviewController.updateStatus as any);
router.post('/:id/feedback', authenticate, interviewController.addFeedback as any);
router.get('/:id/progression-status', authenticateUnified, interviewController.getProgressionStatus as any);

export default router;
