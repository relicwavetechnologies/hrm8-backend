import { Router } from 'express';
import { InterviewController } from './interview.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const controller = new InterviewController();

// Basic CRUD / Listing
router.post('/', unifiedAuthenticate, controller.create);
router.get('/', unifiedAuthenticate, controller.getInterviews);
router.get('/job/:jobId', unifiedAuthenticate, controller.listByJob);
router.get('/calendar/events', unifiedAuthenticate, controller.getCalendarEvents);
router.get('/:id', unifiedAuthenticate, controller.getById);

// Status & Feedback
router.patch('/:id/status', unifiedAuthenticate, controller.updateStatus);
router.put('/:id/status', unifiedAuthenticate, controller.updateStatus); // Alias
router.post('/:id/feedback', unifiedAuthenticate, controller.addFeedback);

// Rescheduling / Cancellation
router.put('/:id/reschedule', unifiedAuthenticate, controller.rescheduleInterview);
router.put('/:id/cancel', unifiedAuthenticate, controller.cancelInterview);
router.put('/:id/no-show', unifiedAuthenticate, controller.markAsNoShow);

// Bulk Operations
router.post('/bulk/reschedule', unifiedAuthenticate, controller.bulkReschedule);
router.post('/bulk/cancel', unifiedAuthenticate, controller.bulkCancel);

export default router;
