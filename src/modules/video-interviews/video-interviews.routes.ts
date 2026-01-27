import { Router } from 'express';
import { VideoInterviewController } from './video-interviews.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new VideoInterviewController();

// Authentication required for all routes
router.use(authenticate);

// Create / Schedule
router.post('/', controller.scheduleInterview);
router.post('/auto-schedule', controller.autoSchedule); // New
router.post('/finalize', controller.finalizeInterviews); // New

// Queries
router.get('/job/:jobId', controller.getJobInterviews);
router.get('/job/:jobId/calendar', controller.getCalendarEvents); // New
router.get('/my-schedule', controller.getMySchedule);
router.get('/:id', controller.getInterview);
router.get('/:id/progression-status', controller.getProgressionStatus); // New

// Actions
router.put('/:id/reschedule', controller.rescheduleInterview);
router.put('/:id/cancel', controller.cancelInterview);
router.put('/:id/feedback', controller.submitFeedback);
router.post('/:id/send-invitation', controller.sendInvitation); // New method usually POST for actions

export default router;
