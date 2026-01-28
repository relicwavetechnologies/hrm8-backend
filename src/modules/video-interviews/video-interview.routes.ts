import { Router } from 'express';
import { videoInterviewController } from './video-interview.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/:id', videoInterviewController.getInterview);

router.get('/job/:jobId', videoInterviewController.getJobInterviews);

router.delete('/:id', videoInterviewController.deleteInterview);

export default router;
