import { Router } from 'express';
import { VideoInterviewController } from './video-interviews.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const controller = new VideoInterviewController();

// Candidate Routes
router.get('/application/:applicationId', authenticateCandidate, controller.getApplicationInterviews);

// Company Routes
router.use(authenticate);

// Create / Schedule
router.post('/', controller.scheduleInterview);
router.post('/auto-schedule', controller.autoSchedule); 
router.post('/finalize', controller.finalizeInterviews); 

// Queries
router.get('/', controller.getCompanyInterviews);
router.get('/job/:jobId', controller.getJobInterviews);
router.get('/job/:jobId/calendar', controller.getCalendarEvents); 
router.get('/my-schedule', controller.getMySchedule);
router.get('/:id', controller.getInterview);
router.get('/:id/progression-status', controller.getProgressionStatus); 

// Actions
router.put('/:id/reschedule', controller.rescheduleInterview);
router.put('/:id/cancel', controller.cancelInterview);
router.put('/:id/feedback', controller.submitFeedback);
router.patch('/:id/status', controller.updateStatus);
router.post('/:id/send-invitation', controller.sendInvitation); 

export default router;
