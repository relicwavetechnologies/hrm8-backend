import { Router } from 'express';
import { VideoInterviewController } from './video-interviews.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new VideoInterviewController();

// Authentication required for all routes
router.use(authenticate);

// Create / Schedule
router.post('/', controller.scheduleInterview);

// Queries
router.get('/job/:jobId', controller.getJobInterviews);
router.get('/my-schedule', controller.getMySchedule);
router.get('/:id', controller.getInterview);

// Actions
router.put('/:id/reschedule', controller.rescheduleInterview);
router.put('/:id/cancel', controller.cancelInterview);
router.put('/:id/feedback', controller.submitFeedback);

export default router;
